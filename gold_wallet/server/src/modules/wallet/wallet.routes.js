const { Router } = require("express");
const controller = require("./wallet.controller");
const { validateBody } = require("../../middleware/validate");
const { withdrawSchema } = require("./wallet.validation");
const { requireAuth } = require("../../middleware/auth");

const router = Router();

// Mounted at /api in app.js, resolving to /api/wallet — both signed-in-only:
// a wallet balance/withdrawal is always tied to an account, unlike the guest
// checkout payments.routes.js allows.
router.get("/wallet", requireAuth, controller.getBalance);
router.post("/wallet/withdraw", requireAuth, validateBody(withdrawSchema), controller.withdraw);

module.exports = router;
