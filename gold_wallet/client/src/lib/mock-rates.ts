export type Metal = "gold" | "silver";

/**
 * USD/BDT used to show the wallet balance in dollars. Same dummy interbank
 * figure gold-price-ticker.tsx displays, kept here so both agree. The
 * gold/silver rates themselves come from wallet_server's real BAJUS-sourced
 * feed now (see use-metal-rate.ts) — this file only keeps the FX constants,
 * which have no live feed behind them yet.
 */
export const USD_BDT_RATE = 121.9;

export type ForeignCurrency = "USD" | "EUR" | "GBP" | "SAR";

/**
 * Demo FX quotes — taka per 1 unit — for the wallet's "value in other
 * currencies" card. USD reuses the figure above so every dollar amount on the
 * site agrees; the rest are illustrative interbank-ish rates, not a live feed.
 * SAR is in the list because it's the currency most Bangladeshi remittances and
 * Hajj savings are quoted in.
 */
export const BDT_PER_FOREIGN_UNIT: Record<ForeignCurrency, number> = {
  USD: USD_BDT_RATE,
  EUR: 132.4,
  GBP: 154.9,
  SAR: 32.5,
};
