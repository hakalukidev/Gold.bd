import type { Metal } from "@/lib/mock-rates";

/**
 * Order-summary math for the buy/sell panels and the Market page's trade card.
 *
 * The per-gram price passed in is the *SKU* price the panel already shows
 * (see productPricePerGram in trade-products.ts); the pieces below are the
 * illustrative BAJUS-style fee model layered on top for display parity: a govt.
 * gold tax charged per bhori and a flat transaction charge on the amount.
 * There's no backend in this repo (see CLAUDE.md) — `/api/{metal}/buy` only
 * accepts `grams` (see validations/gold.ts) — so these figures are shown for
 * the order summary only; the mutation still buys the `grams` this computes,
 * not the fee-inclusive total.
 */
export const BHORI_IN_GRAMS = 11.664;
export const GOVT_GOLD_TAX_PER_BHORI_BDT = 2500;
export const TRANSACTION_CHARGE_RATE = 0.015;

export interface BuyOrderBreakdown {
  grams: number;
  govtTaxBDT: number;
  transactionChargeBDT: number;
  totalPayableBDT: number;
}

/** The govt. gold tax is exactly that — gold only; a silver order is charged
 * the transaction fee alone. */
export function computeBuyOrderBreakdown(amountBDT: number, pricePerGramBDT: number, metal: Metal = "gold"): BuyOrderBreakdown {
  const grams = pricePerGramBDT > 0 ? amountBDT / pricePerGramBDT : 0;
  const govtTaxBDT = metal === "gold" ? (grams / BHORI_IN_GRAMS) * GOVT_GOLD_TAX_PER_BHORI_BDT : 0;
  const transactionChargeBDT = amountBDT * TRANSACTION_CHARGE_RATE;
  const totalPayableBDT = amountBDT + govtTaxBDT + transactionChargeBDT;
  return { grams, govtTaxBDT, transactionChargeBDT, totalPayableBDT };
}

// Sell side: a buy/sell spread rather than a flat charge — the payout quoted
// below market, same shape as computeBuyOrderBreakdown above but subtractive.
export const SELL_SPREAD_RATE = 0.02;

export interface SellPayoutBreakdown {
  grossBDT: number;
  spreadBDT: number;
  netPayoutBDT: number;
}

export function computeSellPayout(grams: number, pricePerGramBDT: number): SellPayoutBreakdown {
  const grossBDT = grams * pricePerGramBDT;
  const spreadBDT = grossBDT * SELL_SPREAD_RATE;
  const netPayoutBDT = grossBDT - spreadBDT;
  return { grossBDT, spreadBDT, netPayoutBDT };
}
