export type Metal = "gold" | "silver";

/**
 * USD/BDT used to show prices in dollars. Same dummy interbank figure
 * gold-price-ticker.tsx displays — not a live feed, since BAJUS (see
 * /api/gold/rate, proxied to wallet_server) only quotes BDT.
 */
export const USD_BDT_RATE = 121.9;

export type ForeignCurrency = "USD" | "EUR" | "GBP" | "SAR";

/**
 * Demo FX quotes — taka per 1 unit. USD reuses the figure above so every
 * dollar amount on the site agrees; the rest are illustrative interbank-ish
 * rates, not a live feed. SAR is in the list because it's the currency most
 * Bangladeshi remittances and Hajj savings are quoted in.
 */
export const BDT_PER_FOREIGN_UNIT: Record<ForeignCurrency, number> = {
  USD: USD_BDT_RATE,
  EUR: 132.4,
  GBP: 154.9,
  SAR: 32.5,
};
