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
router.get("/admin/dashboard", requireAuth, requireAdmin, controller.getDashboard);
router.get("/admin/users", requireAuth, requireAdmin, controller.getUsers);
router.get("/admin/reports/trades", requireAuth, requireAdmin, controller.getTradeReport);

module.exports = router;
