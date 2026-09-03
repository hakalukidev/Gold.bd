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

module.exports = { requireAuth };
