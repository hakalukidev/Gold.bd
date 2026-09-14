const { Router } = require("express");
const controller = require("./collect.controller");
const { validateBody } = require("../../middleware/validate");
const { requestCollectSchema } = require("./collect.validation");
const { requireAuth } = require("../../middleware/auth");
const requireAdmin = require("../../middleware/require-admin");
const { tradeLimiter } = require("../../middleware/rate-limit");

const router = Router();

// Mounted at /api in app.js -> /api/collect, /api/admin/collect/*.
router.post("/collect", requireAuth, tradeLimiter, validateBody(requestCollectSchema), controller.request);

router.get("/admin/collect", requireAuth, requireAdmin, controller.adminList);
router.post("/admin/collect/:id/approve", requireAuth, requireAdmin, controller.adminApprove);

module.exports = router;
