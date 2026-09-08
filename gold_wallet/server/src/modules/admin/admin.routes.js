const { Router } = require("express");
const controller = require("./admin.controller");
const { requireAuth } = require("../../middleware/auth");
const requireAdmin = require("../../middleware/require-admin");

const router = Router();

// Mounted at /api in app.js -> /api/admin/settings. POST rather than PATCH:
// app.js's cors() only allows GET/POST, and nothing else in this API uses
// PATCH either.
router.get("/admin/settings", requireAuth, requireAdmin, controller.getSettings);
router.post("/admin/settings", requireAuth, requireAdmin, controller.updateSettings);

module.exports = router;
