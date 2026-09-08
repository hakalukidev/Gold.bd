/**
 * Server-side authoritative fee math for gold/silver trades — a port of
 * gold_wallet/client/src/lib/gold-fees.ts's constants and formulas. The
 * client only ever showed these figures for the order-summary UI (its own
 * comment says as much: "no backend accepts this breakdown"); trusting a
 * client-computed total would let a tampered request pay/receive whatever
 * it likes, so this module is now the one place a trade's price is actually
 * decided. Keep the DEFAULTS below in sync with gold-fees.ts if the fee
 * model's starting point ever changes — there's no shared package between
 * the two repos. The live rates themselves are admin-editable (see
 * platform-settings.repository.js) — trade.service.js fetches them and
 * passes them in as `settings` rather than this module reading a constant.
 */
const BHORI_IN_GRAMS = 11.664;

const DEFAULTS = {
  govtGoldTaxPerBhoriBdt: 2500,
  transactionChargeRate: 0.015,
  sellSpreadRate: 0.02,
};

/** Buy side: price + govt. gold tax (gold only, charged per bhori) + a flat
 * transaction charge on the traded amount. */
function computeBuyBreakdown(grams, pricePerGramBDT, metal, settings = DEFAULTS) {
  const amountBDT = grams * pricePerGramBDT;
  const govtTaxBDT = metal === "gold" ? (grams / BHORI_IN_GRAMS) * settings.govtGoldTaxPerBhoriBdt : 0;
  const transactionChargeBDT = amountBDT * settings.transactionChargeRate;
  const totalPayableBDT = amountBDT + govtTaxBDT + transactionChargeBDT;
  return { amountBDT, govtTaxBDT, transactionChargeBDT, totalPayableBDT };
}

/** Sell side: a buy/sell spread rather than a flat charge — payout quoted
 * below the market price. */
function computeSellPayout(grams, pricePerGramBDT, settings = DEFAULTS) {
  const grossBDT = grams * pricePerGramBDT;
  const spreadBDT = grossBDT * settings.sellSpreadRate;
  const netPayoutBDT = grossBDT - spreadBDT;
  return { grossBDT, spreadBDT, netPayoutBDT };
}

module.exports = {
  BHORI_IN_GRAMS,
  DEFAULTS,
  computeBuyBreakdown,
  computeSellPayout,
};
