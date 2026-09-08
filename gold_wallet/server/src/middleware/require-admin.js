const HttpError = require("../utils/http-error");

/** Gate for admin-only routes — must run after requireAuth, which is what
 * actually populates req.userRole from the JWT. A 403 (not 401) since the
 * caller IS authenticated, just not authorized for this route. */
function requireAdmin(req, res, next) {
  if (req.userRole !== "ADMIN") {
    throw new HttpError(403, "Admin access required");
  }
  next();
}

module.exports = requireAdmin;
