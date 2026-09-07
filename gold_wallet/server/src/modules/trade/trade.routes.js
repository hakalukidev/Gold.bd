const { Router } = require("express");
const controller = require("./trade.controller");
const { requireAuth } = require("../../middleware/auth");
const { tradeLimiter } = require("../../middleware/rate-limit");

const router = Router();

// Mounted at /api in app.js, resolving to /api/:metal/buy and
// /api/:metal/sell — matches the client's existing use-gold-trade.ts
// contract. Always signed-in: a trade always debits/credits an account,
// unlike the guest checkout payments.routes.js allows.
router.post("/:metal/buy", requireAuth, tradeLimiter, controller.buy);
router.post("/:metal/sell", requireAuth, tradeLimiter, controller.sell);

module.exports = router;
