export type Metal = "gold" | "silver";

/**
 * USD/BDT fallback for when the live feed hasn't answered yet — see
 * useFxRates(), which polls wallet_server's fx-sync.job.js (itself backed by
 * open.er-api.com, no API key required). The gold/silver rates come from
 * wallet_server's real BAJUS-sourced feed too (see use-metal-rate.ts); this
 * file now only holds fallback constants, not the values actually rendered.
 */
export const USD_BDT_RATE = 121.9;

export type ForeignCurrency = "USD" | "EUR" | "GBP" | "SAR";

/**
 * Fallback FX quotes — taka per 1 unit — for the wallet's "value in other
 * currencies" card, used only until useFxRates()'s first live fetch lands (or
 * if it ever fails). USD reuses the figure above so every dollar amount on
 * the site agrees while falling back; the rest are illustrative interbank-ish
 * rates. SAR is in the list because it's the currency most Bangladeshi
 * remittances and Hajj savings are quoted in.
 */
export const BDT_PER_FOREIGN_UNIT: Record<ForeignCurrency, number> = {
  USD: USD_BDT_RATE,
  EUR: 132.4,
  GBP: 154.9,
  SAR: 32.5,
};
