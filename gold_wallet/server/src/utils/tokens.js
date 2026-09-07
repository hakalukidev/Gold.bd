const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

/** Short-lived JWT the client sends as `Authorization: Bearer <token>`. */
function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/**
 * Refresh tokens are opaque random strings, not JWTs: the server is the only
 * party that ever needs to look one up, and doing so by hash means a stolen
 * database dump alone can't be replayed as a session.
 */
function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
};
