/**
 * Order-summary math for the buy-gold page (BuyGoldPanel).
 *
 * `useGoldRate()` already returns the 22K bar rate shown on the page, so the
 * pieces below are the illustrative BAJUS-style fee model layered on top for
 * display parity: a govt. gold tax charged per bhori and a flat transaction
 * charge on the amount. There's no backend in this repo (see CLAUDE.md) —
 * `/api/gold/buy` only accepts `goldGrams` (see validations/gold.ts) — so
 * these figures are shown for the order summary only; the mutation still
 * buys the `goldGrams` this computes, not the fee-inclusive total.
 */
export const BHORI_IN_GRAMS = 11.664;
export const GOVT_GOLD_TAX_PER_BHORI_BDT = 2500;
export const TRANSACTION_CHARGE_RATE = 0.015;

export interface BuyOrderBreakdown {
  goldGrams: number;
  govtTaxBDT: number;
  transactionChargeBDT: number;
  totalPayableBDT: number;
}

export function computeBuyOrderBreakdown(amountBDT: number, pricePerGramBDT: number): BuyOrderBreakdown {
  const goldGrams = pricePerGramBDT > 0 ? amountBDT / pricePerGramBDT : 0;
  const govtTaxBDT = (goldGrams / BHORI_IN_GRAMS) * GOVT_GOLD_TAX_PER_BHORI_BDT;
  const transactionChargeBDT = amountBDT * TRANSACTION_CHARGE_RATE;
  const totalPayableBDT = amountBDT + govtTaxBDT + transactionChargeBDT;
  return { goldGrams, govtTaxBDT, transactionChargeBDT, totalPayableBDT };
}

// Sell side: a buy/sell spread rather than a flat charge — the payout quoted
// below market, same shape as computeBuyOrderBreakdown above but subtractive.
export const SELL_SPREAD_RATE = 0.02;

export interface SellPayoutBreakdown {
  grossBDT: number;
  spreadBDT: number;
  netPayoutBDT: number;
}

export function computeSellPayout(goldGrams: number, pricePerGramBDT: number): SellPayoutBreakdown {
  const grossBDT = goldGrams * pricePerGramBDT;
  const spreadBDT = grossBDT * SELL_SPREAD_RATE;
  const netPayoutBDT = grossBDT - spreadBDT;
  return { grossBDT, spreadBDT, netPayoutBDT };
}
