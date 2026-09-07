const asyncHandler = require("../../utils/async-handler");
const walletService = require("./wallet.service");

const getBalance = asyncHandler(async (req, res) => {
  const wallet = await walletService.getBalance(req.userId);
  res.json({ success: true, data: wallet });
});

const withdraw = asyncHandler(async (req, res) => {
  const wallet = await walletService.withdraw(req.userId, req.body.amountBDT);
  res.json({ success: true, data: wallet });
});

module.exports = { getBalance, withdraw };
