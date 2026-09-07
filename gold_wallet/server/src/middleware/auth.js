const { verifyAccessToken } = require("../utils/tokens");
const HttpError = require("../utils/http-error");
const asyncHandler = require("../utils/async-handler");

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "Authentication required");
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    req.userRole = payload.role;
  } catch {
    throw new HttpError(401, "Invalid or expired session");
  }

  next();
});

/**
 * Same token check as requireAuth, but a missing/invalid one just leaves
 * req.userId unset instead of rejecting the request — for endpoints one
 * caller (a signed-in wallet user) needs tied to their account and another
 * (a guest commerce checkout) doesn't have a session for at all.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme === "Bearer" && token) {
    try {
      const payload = verifyAccessToken(token);
      req.userId = payload.sub;
      req.userRole = payload.role;
    } catch {
      // Invalid/expired token on an optional route: proceed unauthenticated
      // rather than failing the request.
    }
  }

  next();
});

module.exports = { requireAuth, optionalAuth };
