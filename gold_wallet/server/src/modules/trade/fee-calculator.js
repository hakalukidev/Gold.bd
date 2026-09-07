/**
 * Server-side authoritative fee math for gold/silver trades — a port of
 * gold_wallet/client/src/lib/gold-fees.ts's constants and formulas. The
 * client only ever showed these figures for the order-summary UI (its own
 * comment says as much: "no backend accepts this breakdown"); trusting a
 * client-computed total would let a tampered request pay/receive whatever
 * it likes, so this module is now the one place a trade's price is actually
 * decided. Keep these constants in sync with gold-fees.ts if the fee model
 * ever changes — there's no shared package between the two repos.
 */
const BHORI_IN_GRAMS = 11.664;
const GOVT_GOLD_TAX_PER_BHORI_BDT = 2500;
const TRANSACTION_CHARGE_RATE = 0.015;
const SELL_SPREAD_RATE = 0.02;

/** Buy side: price + govt. gold tax (gold only, charged per bhori) + a flat
 * transaction charge on the traded amount. */
function computeBuyBreakdown(grams, pricePerGramBDT, metal) {
  const amountBDT = grams * pricePerGramBDT;
  const govtTaxBDT = metal === "gold" ? (grams / BHORI_IN_GRAMS) * GOVT_GOLD_TAX_PER_BHORI_BDT : 0;
  const transactionChargeBDT = amountBDT * TRANSACTION_CHARGE_RATE;
  const totalPayableBDT = amountBDT + govtTaxBDT + transactionChargeBDT;
  return { amountBDT, govtTaxBDT, transactionChargeBDT, totalPayableBDT };
}

/** Sell side: a buy/sell spread rather than a flat charge — payout quoted
 * below the market price. */
function computeSellPayout(grams, pricePerGramBDT) {
  const grossBDT = grams * pricePerGramBDT;
  const spreadBDT = grossBDT * SELL_SPREAD_RATE;
  const netPayoutBDT = grossBDT - spreadBDT;
  return { grossBDT, spreadBDT, netPayoutBDT };
}

module.exports = {
  BHORI_IN_GRAMS,
  GOVT_GOLD_TAX_PER_BHORI_BDT,
  TRANSACTION_CHARGE_RATE,
  SELL_SPREAD_RATE,
  computeBuyBreakdown,
  computeSellPayout,
};
