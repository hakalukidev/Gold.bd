const env = require("../../config/env");

/** Foreign currencies the wallet's currency-conversion card quotes — must stay
 * in sync with ForeignCurrency in both frontends' lib/mock-rates.ts. */
const FOREIGN_CURRENCIES = ["USD", "EUR", "GBP", "SAR"];

async function fetchFxPayload() {
  const res = await fetch(env.FX_API_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`FX API responded with HTTP ${res.status}`);
  const payload = await res.json();
  // open.er-api.com signals failure with HTTP 200 + result: "error" (e.g. an
  // unsupported base code), so a 2xx status alone doesn't mean usable data.
  if (payload.result !== "success") {
    throw new Error(`FX API returned result="${payload.result}"${payload["error-type"] ? `: ${payload["error-type"]}` : ""}`);
  }
  return payload;
}

/**
 * The feed quotes everything against its own base (USD) — `rates.BDT` is
 * "BDT per 1 USD", `rates.EUR` is "EUR per 1 USD", etc. The wallet card wants
 * the inverse for every currency: "BDT per 1 <currency>". For USD that's
 * `rates.BDT` directly; for the rest it's `rates.BDT / rates.<currency>`
 * (BDT-per-USD divided by <currency>-per-USD cancels the USD leg).
 */
function toBdtPerForeignUnit(payload) {
  const rates = payload.rates ?? {};
  const bdtPerUsd = Number(rates.BDT);
  if (!Number.isFinite(bdtPerUsd) || bdtPerUsd <= 0) {
    throw new Error("FX API payload is missing a usable BDT rate");
  }

  const result = {};
  for (const currency of FOREIGN_CURRENCIES) {
    if (currency === "USD") {
      result.USD = bdtPerUsd;
      continue;
    }
    const perUsd = Number(rates[currency]);
    if (!Number.isFinite(perUsd) || perUsd <= 0) {
      throw new Error(`FX API payload is missing a usable ${currency} rate`);
    }
    result[currency] = bdtPerUsd / perUsd;
  }
  return result;
}

module.exports = { fetchFxPayload, toBdtPerForeignUnit, FOREIGN_CURRENCIES };
