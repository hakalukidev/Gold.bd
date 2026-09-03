import type { MetalRateSummary } from "@/types";

export type Metal = "gold" | "silver";

/**
 * Stand-in for the real rate feed until a backend exists (this app is the
 * frontend on its own — there is no `/api/*` implementation behind it). Each
 * metal is anchored to the same dummy figure gold_commerce's ticker uses (24K
 * gold ৳21,839/g, silver ৳385/g — the latter also the calculator's silver
 * default) so every price shown across both apps agrees with every other.
 */
const ANCHOR_PRICE_PER_GRAM: Record<Metal, number> = {
  gold: 21839,
  silver: 385,
};

// Silver is the more volatile of the two, so it gets a wider daily swing.
const DAILY_VOLATILITY: Record<Metal, number> = {
  gold: 0.01,
  silver: 0.018,
};

/**
 * USD/BDT used to show the wallet balance in dollars. Same dummy interbank
 * figure gold-price-ticker.tsx displays, kept here so both agree.
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

const HISTORY_DAYS = 45;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// Deterministic PRNG (mulberry32) so the walk — and therefore every price on
// the site — stays stable across requests instead of jittering on refetch.
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildHistory(metal: Metal): MetalRateSummary[] {
  // Distinct seeds so gold and silver don't trace the same shape.
  const rand = mulberry32(metal === "gold" ? 20260817 : 19980412);
  // Snapped to the top of the hour so a server render and the client render
  // that hydrates it land on the same calendar day, and any date label drawn
  // from these timestamps formats to the same string on both — the same reason
  // mock-transactions.ts snaps its rows.
  const now = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
  const volatility = DAILY_VOLATILITY[metal];

  // Walk backward from today's anchor price so the series always ends exactly
  // on the ticker's dummy figure, with a mild upward drift into the past
  // (i.e. prices were a bit lower further back) plus daily noise.
  const prices: number[] = [ANCHOR_PRICE_PER_GRAM[metal]];
  for (let i = 1; i < HISTORY_DAYS; i++) {
    const dailyChangePct = (rand() - 0.5) * volatility + 0.0008;
    prices.push(prices[i - 1] / (1 + dailyChangePct));
  }
  prices.reverse();

  return prices.map((price, i) => ({
    pricePerGramBDT: price.toFixed(2),
    effectiveAt: new Date(now - (HISTORY_DAYS - 1 - i) * DAY_MS).toISOString(),
  }));
}

const cachedHistory: Partial<Record<Metal, MetalRateSummary[]>> = {};

export function getRateHistory(metal: Metal): MetalRateSummary[] {
  cachedHistory[metal] ??= buildHistory(metal);
  return cachedHistory[metal];
}

export function getLatestRate(metal: Metal): MetalRateSummary {
  const history = getRateHistory(metal);
  return history[history.length - 1];
}

// Month-on-month swings are wider than a single day's, and both metals drifted
// up over the past couple of years — the same shape the daily walk uses, just
// stepped a month at a time.
const MONTHLY_VOLATILITY: Record<Metal, number> = {
  gold: 0.052,
  silver: 0.085,
};
const MONTHLY_DRIFT = 0.012;

// Deep enough to cover every range the wallet's flow chart offers; callers take
// the tail, so switching 6 ↔ 12 months never redraws the months they share.
const MONTHLY_HISTORY_MONTHS = 25;

function buildMonthlyHistory(metal: Metal): MetalRateSummary[] {
  // Seeds distinct from the daily walk's so the two series aren't the same
  // curve at different sampling rates.
  const rand = mulberry32(metal === "gold" ? 20240131 : 20011225);
  const now = new Date();

  const prices: number[] = [ANCHOR_PRICE_PER_GRAM[metal]];
  for (let i = 1; i < MONTHLY_HISTORY_MONTHS; i++) {
    const monthlyChangePct =
      (rand() - 0.5) * MONTHLY_VOLATILITY[metal] + MONTHLY_DRIFT;
    prices.push(prices[i - 1] / (1 + monthlyChangePct));
  }
  prices.reverse();

  return prices.map((price, i) => ({
    pricePerGramBDT: price.toFixed(2),
    // Dated to the month itself; the last entry is the current month, priced
    // at the anchor so it agrees with getLatestRate().
    effectiveAt: new Date(
      now.getFullYear(),
      now.getMonth() - (MONTHLY_HISTORY_MONTHS - 1 - i),
      1,
    ).toISOString(),
  }));
}

const cachedMonthlyHistory: Partial<Record<Metal, MetalRateSummary[]>> = {};

/**
 * One price per gram per calendar month, oldest first, ending on the current
 * month. Used to value a holding across months — the daily history only spans
 * 45 days, which can't reach back far enough for a year of monthly figures.
 */
export function getMonthlyRateHistory(
  metal: Metal,
  months = 12,
): MetalRateSummary[] {
  cachedMonthlyHistory[metal] ??= buildMonthlyHistory(metal);
  return cachedMonthlyHistory[metal].slice(-months);
}
