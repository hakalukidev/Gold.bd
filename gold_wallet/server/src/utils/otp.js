const crypto = require("node:crypto");
const env = require("../config/env");

/** crypto.randomInt is a CSPRNG — Math.random() must never be used for anything security-sensitive. */
function generateOtp() {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);
  return { code, codeHash, expiresAt };
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

module.exports = { generateOtp, hashOtp };
