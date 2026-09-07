const env = require("../../config/env");
const asyncHandler = require("../../utils/async-handler");
const authService = require("./auth.service");
const userRepo = require("../../repositories/user.repository");

const REFRESH_COOKIE_NAME = "refresh_token";
const REFRESH_COOKIE_PATH = "/api/auth";

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions(), maxAge: undefined });
}

function requestMeta(req) {
  return { userAgent: req.get("user-agent"), ipAddress: req.ip };
}

/** Registration step 1: validates the form and texts a 6-digit code; no account exists yet. */
const requestRegisterOtp = asyncHandler(async (req, res) => {
  const { phone, devCode } = await authService.requestRegistration(req.body);
  res.status(200).json({ success: true, data: { phone, devCode } });
});

/** Registration step 2: the code proves phone ownership and creates the account. */
const verifyRegisterOtp = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.verifyRegistration(req.body, requestMeta(req));
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ success: true, data: { user, accessToken } });
});

/** Login step 1: verifies the password and texts a 6-digit code (2FA); no session yet. */
const requestLoginOtp = asyncHandler(async (req, res) => {
  const { phone, devCode } = await authService.requestLogin(req.body);
  res.status(200).json({ success: true, data: { phone, devCode } });
});

/** Login step 2: the code completes 2FA and issues the session. */
const verifyLoginOtp = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.verifyLogin(req.body, requestMeta(req));
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ success: true, data: { user, accessToken } });
});

const refresh = asyncHandler(async (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
  const { user, accessToken, refreshToken } = await authService.refresh(presented, requestMeta(req));
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ success: true, data: { user, accessToken } });
});

const logout = asyncHandler(async (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
  await authService.logout(presented);
  clearRefreshCookie(res);
  res.status(200).json({ success: true, data: null });
});

const me = asyncHandler(async (req, res) => {
  const user = await userRepo.findById(req.userId);
  res.status(200).json({ success: true, data: { user } });
});

module.exports = {
  requestRegisterOtp,
  verifyRegisterOtp,
  requestLoginOtp,
  verifyLoginOtp,
  refresh,
  logout,
  me,
};
