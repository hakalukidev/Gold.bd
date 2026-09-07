const { Router } = require("express");
const controller = require("./payment.controller");
const { validateBody } = require("../../middleware/validate");
const { initPaymentSchema } = require("./payment.validation");
const { optionalAuth } = require("../../middleware/auth");
const { paymentInitLimiter } = require("../../middleware/rate-limit");

const router = Router();

// Mounted at /api in app.js. success/fail/cancel/ipn are called by
// SSLCommerz itself (a full-page browser POST for the first three, a
// server-to-server POST for ipn) — never by either frontend's own fetch
// client — so they take the gateway's form-urlencoded body, not JSON.
router.post("/payments/init", paymentInitLimiter, optionalAuth, validateBody(initPaymentSchema), controller.initPayment);
router.get("/payments/:tranId", controller.getStatus);

router.post("/payments/ipn", controller.handleIpn);
router.post("/payments/success", controller.handleSuccess);
router.post("/payments/fail", controller.handleFail);
router.post("/payments/cancel", controller.handleCancel);

module.exports = router;
