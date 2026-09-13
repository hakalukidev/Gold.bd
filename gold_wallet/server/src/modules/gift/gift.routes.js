const { Router } = require("express");
const controller = require("./gift.controller");
const { validateBody } = require("../../middleware/validate");
const { sendGiftSchema } = require("./gift.validation");
const { requireAuth } = require("../../middleware/auth");
const { tradeLimiter } = require("../../middleware/rate-limit");

const router = Router();

// Mounted at /api in app.js -> /api/gift. Same limiter as trade's buy/sell:
// a gift moves real balance the same way a trade does, just without a rate.
router.post("/gift", requireAuth, tradeLimiter, validateBody(sendGiftSchema), controller.send);

module.exports = router;
