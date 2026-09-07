const HttpError = require("../../utils/http-error");
const walletRepo = require("../../repositories/wallet.repository");
const ledgerRepo = require("../../repositories/ledger.repository");
const withTransaction = require("../../db/with-transaction");

async function getBalance(userId) {
  return walletRepo.findByUserId(userId);
}

/**
 * Demo flow — no payout gateway exists yet (see add-money-panel.tsx), so a
 * withdrawal just debits the balance directly instead of moving real money
 * out. Still goes through the same atomic debit-then-ledger-entry pattern as
 * every other balance movement (see trade.service.js, payment.service.js).
 */
async function withdraw(userId, amountBDT) {
  const entry = await withTransaction(async (client) => {
    const wallet = await walletRepo.debitCash(userId, amountBDT, client);
    if (!wallet) return null;
    await ledgerRepo.insert(
      {
        userId,
        type: "WITHDRAW",
        cashDelta: (-Number(amountBDT)).toFixed(2),
        cashBalanceAfter: wallet.cashBalanceBDT,
        goldBalanceAfter: wallet.goldBalanceGrams,
        silverBalanceAfter: wallet.silverBalanceGrams,
      },
      client
    );
    return wallet;
  });
  if (!entry) throw new HttpError(400, "Insufficient balance");
  return entry;
}

module.exports = { getBalance, withdraw };
