const env = require("../../config/env");
const HttpError = require("../../utils/http-error");
const logger = require("../../utils/logger");
const { hashPassword, verifyPassword } = require("../../utils/password");
const { signAccessToken, generateRefreshToken, hashRefreshToken } = require("../../utils/tokens");
const { generateOtp, hashOtp } = require("../../utils/otp");
const { sendSms } = require("../../utils/sms");
const userRepo = require("../../repositories/user.repository");
const refreshTokenRepo = require("../../repositories/refresh-token.repository");
const otpRepo = require("../../repositories/otp-challenge.repository");

const GENERIC_LOGIN_ERROR = "Invalid phone number or password";
const GENERIC_OTP_ERROR = "Invalid or expired code";

async function issueSession(user, meta) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();
  await refreshTokenRepo.insert({
    userId: user.id,
    tokenHash,
    expiresAt,
    userAgent: meta?.userAgent,
    ipAddress: meta?.ipAddress,
  });
  return { accessToken, refreshToken };
}

/** Blocks re-sending a fresh code to the same phone/purpose faster than the cooldown, to bound SMS spend and spam. */
async function assertResendCooldown(phone, purpose) {
  const existing = await otpRepo.findActive(phone, purpose);
  if (!existing) return;
  const elapsedMs = Date.now() - new Date(existing.created_at).getTime();
  const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;
  if (elapsedMs < cooldownMs) {
    const waitSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
    throw new HttpError(429, `Please wait ${waitSeconds}s before requesting another code`);
  }
}

/** Shared OTP-checking: loads the challenge, enforces expiry/attempt limits, and burns an attempt on mismatch. */
async function consumeOtpChallenge(phone, purpose, code) {
  const challenge = await otpRepo.findActive(phone, purpose);
  if (!challenge) throw new HttpError(400, GENERIC_OTP_ERROR);

  if (new Date(challenge.expires_at) < new Date()) {
    await otpRepo.remove(challenge.id);
    throw new HttpError(400, GENERIC_OTP_ERROR);
  }

  if (challenge.attempts >= env.OTP_MAX_ATTEMPTS) {
    await otpRepo.remove(challenge.id);
    throw new HttpError(400, "Too many incorrect attempts. Please request a new code.");
  }

  if (challenge.code_hash !== hashOtp(code)) {
    await otpRepo.incrementAttempts(challenge.id);
    throw new HttpError(400, GENERIC_OTP_ERROR);
  }

  await otpRepo.remove(challenge.id);
  return challenge;
}

async function requestRegistration({ fullName, phone, email, password }) {
  if (await userRepo.findByPhone(phone)) {
    throw new HttpError(409, "An account with this phone number already exists", {
      phone: ["This phone number is already registered"],
    });
  }
  if (email && (await userRepo.findByEmail(email))) {
    throw new HttpError(409, "An account with this email already exists", {
      email: ["This email is already registered"],
    });
  }

  await assertResendCooldown(phone, "REGISTER");

  const passwordHash = await hashPassword(password);
  const { code, codeHash, expiresAt } = generateOtp();

  await sendSms(phone, `Your Gold BD verification code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.`);
  await otpRepo.upsert({
    phone,
    purpose: "REGISTER",
    codeHash,
    expiresAt,
    payload: { fullName, email: email || null, passwordHash },
  });

  logger.info({ phone }, "Registration OTP issued");
  // Outside production, sendSms() only logs the code instead of texting it —
  // hand it back in the response too so the OTP screen can self-fill it.
  return { phone, devCode: env.NODE_ENV === "production" ? undefined : code };
}

async function verifyRegistration({ phone, code }, meta) {
  const challenge = await consumeOtpChallenge(phone, "REGISTER", code);
  const { fullName, email, passwordHash } = challenge.payload;

  // Re-check uniqueness: someone else could have claimed this phone/email
  // while this code was outstanding. The DB's UNIQUE constraints are the real
  // guard (this is a friendlier error than a raw constraint violation).
  if (await userRepo.findByPhone(phone)) {
    throw new HttpError(409, "An account with this phone number already exists");
  }
  if (email && (await userRepo.findByEmail(email))) {
    throw new HttpError(409, "An account with this email already exists");
  }

  const user = await userRepo.create({ fullName, phone, email, passwordHash });
  const session = await issueSession(user, meta);
  logger.info({ userId: user.id }, "User registered");
  return { user, ...session };
}

async function requestLogin({ phone, password }) {
  const record = await userRepo.findByPhone(phone);

  // Always run a bcrypt comparison, even for a phone that doesn't exist, so
  // response timing can't be used to enumerate accounts.
  const passwordHash = record?.password_hash || "$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltinvalidsa";
  const passwordOk = await verifyPassword(password, passwordHash);

  if (!record || !record.is_active) {
    throw new HttpError(401, GENERIC_LOGIN_ERROR);
  }

  if (record.locked_until && new Date(record.locked_until) > new Date()) {
    throw new HttpError(423, "Account temporarily locked due to repeated failed sign-ins. Try again later.");
  }

  if (!passwordOk) {
    await userRepo.registerFailedLogin(record.id, env.LOGIN_MAX_ATTEMPTS, env.LOGIN_LOCKOUT_MINUTES);
    throw new HttpError(401, GENERIC_LOGIN_ERROR);
  }

  await userRepo.resetFailedLogins(record.id);
  await assertResendCooldown(phone, "LOGIN");

  const { code, codeHash, expiresAt } = generateOtp();
  await sendSms(phone, `Your Gold BD sign-in code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.`);
  await otpRepo.upsert({ phone, purpose: "LOGIN", codeHash, expiresAt, userId: record.id });

  logger.info({ userId: record.id }, "Login OTP issued");
  // Outside production, sendSms() only logs the code instead of texting it —
  // hand it back in the response too so the OTP screen can self-fill it.
  return { phone, devCode: env.NODE_ENV === "production" ? undefined : code };
}

async function verifyLogin({ phone, code }, meta) {
  const challenge = await consumeOtpChallenge(phone, "LOGIN", code);
  const user = await userRepo.findById(challenge.user_id);
  if (!user) throw new HttpError(401, GENERIC_LOGIN_ERROR);

  const session = await issueSession(user, meta);
  logger.info({ userId: user.id }, "User logged in");
  return { user, ...session };
}

async function refresh(presentedToken, meta) {
  if (!presentedToken) throw new HttpError(401, "Missing refresh token");

  const tokenHash = hashRefreshToken(presentedToken);
  const record = await refreshTokenRepo.findByHash(tokenHash);

  if (!record) throw new HttpError(401, "Invalid refresh token");

  if (record.revoked_at) {
    // A rotated-out (or already-logged-out) token was replayed: treat this as
    // possible theft and kill every session for the account.
    logger.warn({ userId: record.user_id }, "Refresh token reuse detected — revoking all sessions");
    await refreshTokenRepo.revokeAllForUser(record.user_id);
    throw new HttpError(401, "Session invalidated, please sign in again");
  }

  if (new Date(record.expires_at) < new Date()) {
    throw new HttpError(401, "Refresh token expired");
  }

  const user = await userRepo.findById(record.user_id);
  if (!user) throw new HttpError(401, "Invalid refresh token");

  const accessToken = signAccessToken(user);
  const next = generateRefreshToken();
  await refreshTokenRepo.insert({
    userId: user.id,
    tokenHash: next.tokenHash,
    expiresAt: next.expiresAt,
    userAgent: meta?.userAgent,
    ipAddress: meta?.ipAddress,
  });
  await refreshTokenRepo.markRotated(tokenHash, next.tokenHash);

  return { user, accessToken, refreshToken: next.token };
}

async function logout(presentedToken) {
  if (!presentedToken) return;
  await refreshTokenRepo.revoke(hashRefreshToken(presentedToken));
}

module.exports = { requestRegistration, verifyRegistration, requestLogin, verifyLogin, refresh, logout };
