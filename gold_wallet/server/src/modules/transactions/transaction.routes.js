const { Router } = require("express");
const controller = require("./transaction.controller");
const { requireAuth } = require("../../middleware/auth");

const router = Router();

// Mounted at /api in app.js, resolving to /api/transactions — matches the
// client's existing use-transactions.ts contract.
router.get("/transactions", requireAuth, controller.getTransactions);

module.exports = router;
