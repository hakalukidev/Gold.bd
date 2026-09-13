const HttpError = require("../../utils/http-error");
const withTransaction = require("../../db/with-transaction");
const walletRepo = require("../../repositories/wallet.repository");
const ledgerRepo = require("../../repositories/ledger.repository");
const userRepo = require("../../repositories/user.repository");

/**
 * Moves `grams` of `metal` straight from the sender's wallet into an
 * existing recipient's — no rate lookup, fee or tax, since nothing is being
 * bought: the sender already owns this metal, a gift just retitles it.
 * Recipient must already have an account (no pending/claim flow yet — see
 * gift-gold-panel.tsx). Debit, credit and both ledger rows happen in one
 * transaction so a gift is never partially applied.
 */
// `message` is accepted but not persisted — no column for it (see
// 0008_create_ledger_entries.sql) and this stayed a UI-only nicety, same
// scope as gift-gold-panel.tsx's "custom photo" toggle.
async function send(senderId, { recipientPhone, metal, grams }) {
  const recipient = await userRepo.findByPhone(recipientPhone);
  if (!recipient) {
    throw new HttpError(404, "No Gold.bd account found for that phone number");
  }
  if (recipient.id === senderId) {
    throw new HttpError(400, "You can't gift yourself");
  }

  const sender = await userRepo.findById(senderId);
  const deltaKey = `${metal}Delta`;

  return withTransaction(async (client) => {
    const senderWallet = await walletRepo.applyDelta(senderId, { [deltaKey]: -grams }, client);
    if (!senderWallet) throw new HttpError(400, `Insufficient ${metal} balance`);
    const recipientWallet = await walletRepo.applyDelta(recipient.id, { [deltaKey]: grams }, client);

    const senderEntry = await ledgerRepo.insert(
      {
        userId: senderId,
        type: "GIFT_SENT",
        metal,
        grams: grams.toFixed(4),
        goldDelta: metal === "gold" ? (-grams).toFixed(4) : "0.0000",
        silverDelta: metal === "silver" ? (-grams).toFixed(4) : "0.0000",
        cashBalanceAfter: senderWallet.cashBalanceBDT,
        goldBalanceAfter: senderWallet.goldBalanceGrams,
        silverBalanceAfter: senderWallet.silverBalanceGrams,
        counterpartyPhone: recipient.phone,
      },
      client
    );

    await ledgerRepo.insert(
      {
        userId: recipient.id,
        type: "GIFT_RECEIVED",
        metal,
        grams: grams.toFixed(4),
        goldDelta: metal === "gold" ? grams.toFixed(4) : "0.0000",
        silverDelta: metal === "silver" ? grams.toFixed(4) : "0.0000",
        cashBalanceAfter: recipientWallet.cashBalanceBDT,
        goldBalanceAfter: recipientWallet.goldBalanceGrams,
        silverBalanceAfter: recipientWallet.silverBalanceGrams,
        counterpartyPhone: sender.phone,
      },
      client
    );

    return senderEntry;
  });
}

module.exports = { send };
