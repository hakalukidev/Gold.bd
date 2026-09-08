const HttpError = require("../../utils/http-error");
const withTransaction = require("../../db/with-transaction");
const walletRepo = require("../../repositories/wallet.repository");
const ledgerRepo = require("../../repositories/ledger.repository");
const metalRateRepo = require("../../repositories/metal-rate.repository");
const platformSettingsRepo = require("../../repositories/platform-settings.repository");
const feeCalc = require("./fee-calculator");

// Same anchor grade rate.controller.js prices everything off — BAJUS's real
// 22K reading, not a back-solved 24K figure.
const ANCHOR_KARAT = "22k";
const UNIQUE_VIOLATION = "23505";

async function getRateOrThrow(metal) {
  const rate = await metalRateRepo.getLatest(metal, ANCHOR_KARAT);
  if (!rate) throw new HttpError(404, `No ${metal} rate available yet`);
  return Number(rate.pricePerGramBDT);
}

/** Runs `execute` (which does the debit/credit + ledger insert) with
 * idempotency-key replay protection: a repeat call with the same key — either
 * because the caller checked first, or because two concurrent requests
 * raced and both reached the unique-index insert — returns the original
 * result instead of double-applying the trade. */
async function withIdempotency(userId, idempotencyKey, execute) {
  if (idempotencyKey) {
    const existing = await ledgerRepo.findByIdempotencyKey(userId, idempotencyKey);
    if (existing) return existing;
  }
  try {
    return await execute();
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION && idempotencyKey) {
      const existing = await ledgerRepo.findByIdempotencyKey(userId, idempotencyKey);
      if (existing) return existing;
    }
    throw err;
  }
}

/**
 * Buys `grams` of `metal` for `userId` at the current server-side rate.
 * Price, tax and fees are all computed here — never trusted from the
 * request, which only ever carries the weight — and the debit/credit +
 * ledger row are written atomically (see wallet.repository.js#applyDelta).
 */
async function buy(userId, metal, grams, idempotencyKey, karat = 22) {
  const purity = metal === "gold" ? karat / 22 : 1;
  const balanceGrams = grams * purity;
  const pricePerGramBDT = (await getRateOrThrow(metal)) * purity;
  const settings = await platformSettingsRepo.getFeeSettings();
  const { govtTaxBDT, transactionChargeBDT, totalPayableBDT } = feeCalc.computeBuyBreakdown(
    grams,
    pricePerGramBDT,
    metal,
    settings
  );

  return withIdempotency(userId, idempotencyKey, () =>
    withTransaction(async (client) => {
      const wallet = await walletRepo.applyDelta(userId, { cashDelta: -totalPayableBDT, [`${metal}Delta`]: balanceGrams }, client);
      if (!wallet) throw new HttpError(400, "Insufficient balance");

      return ledgerRepo.insert(
        {
          userId,
          type: "BUY",
          metal,
          grams: grams.toFixed(4),
          pricePerGramBDT: pricePerGramBDT.toFixed(4),
          feeBDT: transactionChargeBDT.toFixed(2),
          taxBDT: govtTaxBDT.toFixed(2),
          cashDelta: (-totalPayableBDT).toFixed(2),
          goldDelta: metal === "gold" ? balanceGrams.toFixed(4) : "0.0000",
          silverDelta: metal === "silver" ? grams.toFixed(4) : "0.0000",
          cashBalanceAfter: wallet.cashBalanceBDT,
          goldBalanceAfter: wallet.goldBalanceGrams,
          silverBalanceAfter: wallet.silverBalanceGrams,
          idempotencyKey,
        },
        client
      );
    })
  );
}

/** Sells `grams` of `metal` for `userId` at the current server-side rate,
 * net of the sell spread — same atomicity and idempotency guarantees as buy. */
async function sell(userId, metal, grams, idempotencyKey, karat = 22) {
  const purity = metal === "gold" ? karat / 22 : 1;
  const balanceGrams = grams * purity;
  const pricePerGramBDT = (await getRateOrThrow(metal)) * purity;
  const settings = await platformSettingsRepo.getFeeSettings();
  const { spreadBDT, netPayoutBDT } = feeCalc.computeSellPayout(grams, pricePerGramBDT, settings);

  return withIdempotency(userId, idempotencyKey, () =>
    withTransaction(async (client) => {
      const wallet = await walletRepo.applyDelta(userId, { cashDelta: netPayoutBDT, [`${metal}Delta`]: -balanceGrams }, client);
      if (!wallet) throw new HttpError(400, `Insufficient ${metal} balance`);

      return ledgerRepo.insert(
        {
          userId,
          type: "SELL",
          metal,
          grams: grams.toFixed(4),
          pricePerGramBDT: pricePerGramBDT.toFixed(4),
          feeBDT: spreadBDT.toFixed(2),
          taxBDT: "0.00",
          cashDelta: netPayoutBDT.toFixed(2),
          goldDelta: metal === "gold" ? (-balanceGrams).toFixed(4) : "0.0000",
          silverDelta: metal === "silver" ? (-grams).toFixed(4) : "0.0000",
          cashBalanceAfter: wallet.cashBalanceBDT,
          goldBalanceAfter: wallet.goldBalanceGrams,
          silverBalanceAfter: wallet.silverBalanceGrams,
          idempotencyKey,
        },
        client
      );
    })
  );
}

module.exports = { buy, sell };
