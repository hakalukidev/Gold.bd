const { Router } = require("express");
const controller = require("./auth.controller");
const { validateBody } = require("../../middleware/validate");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  verifyRegisterSchema,
  verifyLoginSchema,
} = require("./auth.validation");
const { requireAuth } = require("../../middleware/auth");
const { authLimiter, otpRequestLimiter } = require("../../middleware/rate-limit");

const router = Router();

router.post("/register", otpRequestLimiter, validateBody(registerSchema), controller.requestRegisterOtp);
router.post("/register/verify", authLimiter, validateBody(verifyRegisterSchema), controller.verifyRegisterOtp);

router.post("/login", otpRequestLimiter, validateBody(loginSchema), controller.requestLoginOtp);
router.post("/login/verify", authLimiter, validateBody(verifyLoginSchema), controller.verifyLoginOtp);

router.post("/refresh", authLimiter, validateBody(refreshSchema), controller.refresh);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);

module.exports = router;
