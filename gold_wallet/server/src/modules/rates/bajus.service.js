const env = require("../../config/env");
const logger = require("../../utils/logger");
const { KARATS } = require("../../repositories/metal-rate.repository");

/** 1 bhori (ভরি), also called a vori or tola = 11.664 grams = 16 ana. */
const GRAMS_PER_BHORI = 11.664;

// bajus.org 403s any request without a browser-looking User-Agent (no API
// key or bot-friendly endpoint — this is their actual public rate page).
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchBajusHtml() {
  const res = await fetch(env.BAJUS_URL, {
    headers: { "User-Agent": BROWSER_USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`bajus.org responded with HTTP ${res.status}`);
  return res.text();
}

/** "22 KARAT Gold" -> "22k", "TRADITIONAL Gold" -> "sonaton". */
function karatFromLabel(label) {
  const numbered = label.match(/(\d+)\s*KARAT/i);
  if (numbered) return `${numbered[1]}k`;
  if (/TRADITIONAL/i.test(label)) return "sonaton";
  return null;
}

/**
 * The page shows no per-update timestamp of its own — only a dated
 * "View In PDF" link (e.g. ".../Gold Price/12-September-2026.pdf"), which is
 * the closest thing BAJUS publishes to an "as of" date for these figures.
 * Falls back to now() if that link is ever missing or reformatted.
 */
function parseReportDate(html) {
  const match = html.match(/Gold Price\/(\d{1,2})-([A-Za-z]+)-(\d{4})\.pdf/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(`${day} ${month} ${year} 00:00:00 GMT+0600`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractTable(html, tableClass) {
  const match = html.match(new RegExp(`<table[^>]*class="[^"]*${tableClass}[^"]*"[\\s\\S]*?</table>`));
  return match?.[0] ?? "";
}

/** Each row looks like:
 *   <h6> 22 KARAT Gold </h6> ... <span class="price">19,970 BDT/GRAM</span>
 * across two `<table>`s (gold-table / silver-table) — no JSON, so this reads
 * the karat label and price straight out of the markup. */
function extractRows(tableHtml, metal, reportedAt, effectiveAt) {
  const rowRegex = /<h6>\s*([\s\S]*?)\s*<\/h6>[\s\S]*?<span class="price">\s*([\d,]+)\s*BDT\/GRAM\s*<\/span>/g;
  const rows = [];
  let match;
  while ((match = rowRegex.exec(tableHtml))) {
    const karat = karatFromLabel(match[1]);
    if (!karat || !KARATS.includes(karat)) continue;

    const pricePerGramBDT = Number(match[2].replace(/,/g, ""));
    if (!Number.isFinite(pricePerGramBDT) || pricePerGramBDT <= 0) continue;

    rows.push({
      metal,
      karat,
      pricePerGramBDT: pricePerGramBDT.toFixed(4),
      pricePerBhoriBDT: (pricePerGramBDT * GRAMS_PER_BHORI).toFixed(2),
      source: "bajus.org",
      reportedAt,
      effectiveAt,
    });
  }
  return rows;
}

/** Scrapes today's gold + silver karat rates out of the bajus.org HTML page.
 * Unlike a JSON feed there's no history backfill here — only "today"'s
 * table — so historical rows accumulate one per day as the sync job polls. */
function toRateRows(html) {
  const reportDate = parseReportDate(html);
  const effectiveAt = reportDate ?? new Date();
  const reportedAt = reportDate;

  return [
    ...extractRows(extractTable(html, "gold-table"), "gold", reportedAt, effectiveAt),
    ...extractRows(extractTable(html, "silver-table"), "silver", reportedAt, effectiveAt),
  ];
}

// ---------------------------------------------------------------------------
// Fallback: the bajusrate.com JSON feed.
//
// bajus.org sits behind Cloudflare, which serves a bot challenge (HTTP 403,
// `cf-mitigated: challenge`) to datacenter IPs — i.e. to our own VPS — no
// matter what User-Agent we send. bajusrate.com mirrors the same BAJUS
// figures as plain JSON and isn't challenged, though it can lag bajus.org by
// a few days, so it's only used when the scrape above fails.
// ---------------------------------------------------------------------------

/** The feed reports times in Asia/Dhaka local time with no offset of its
 * own ("YYYY-MM-DD HH:mm:ss" / "YYYY-MM-DD"), so both parse against a fixed
 * +06:00 rather than the server's local timezone. */
function parseBdDateTime(value) {
  return new Date(`${value.replace(" ", "T")}+06:00`);
}

function parseBdDate(value) {
  return new Date(`${value}T00:00:00+06:00`);
}

async function fetchBajusFeed() {
  const res = await fetch(env.BAJUS_FALLBACK_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`bajusrate.com responded with HTTP ${res.status}`);
  return res.json();
}

function buildFeedRow(metal, karat, rawValue, reportedAt, effectiveAt) {
  const pricePerGramBDT = Number(rawValue);
  if (!Number.isFinite(pricePerGramBDT) || pricePerGramBDT <= 0) return null;
  return {
    metal,
    karat,
    pricePerGramBDT: pricePerGramBDT.toFixed(4),
    pricePerBhoriBDT: (pricePerGramBDT * GRAMS_PER_BHORI).toFixed(2),
    source: "bajusrate.com",
    reportedAt,
    effectiveAt,
  };
}

/** Flattens the feed (latest `rates` plus its `history` backfill) into one
 * row per (metal, karat, day). The feed's field names (`gold_22k`,
 * `silver_sonaton`, ...) line up with our karat keys directly. */
function feedToRateRows(payload) {
  const rows = [];
  const pushDay = (source, reportedAt, effectiveAt) => {
    for (const karat of KARATS) {
      for (const metal of ["gold", "silver"]) {
        const row = buildFeedRow(metal, karat, source[`${metal}_${karat}`], reportedAt, effectiveAt);
        if (row) rows.push(row);
      }
    }
  };

  if (payload.last_updated) {
    const reportedAt = parseBdDateTime(payload.last_updated);
    const effectiveAt = parseBdDate(payload.last_updated.slice(0, 10));
    pushDay({ ...payload.rates?.gold_rates, ...payload.rates?.silver_rates }, reportedAt, effectiveAt);
  }

  for (const entry of payload.history ?? []) {
    if (entry?.date) pushDay(entry, null, parseBdDate(entry.date));
  }

  return rows;
}

/** Tries the bajus.org scrape first and falls back to the bajusrate.com
 * feed if that throws or yields no rows. Throws only when both fail (or the
 * fallback is disabled by leaving BAJUS_FALLBACK_URL blank). */
async function fetchRateRows() {
  let primaryError;
  try {
    const rows = toRateRows(await fetchBajusHtml());
    if (rows.length > 0) return { rows, source: "bajus.org" };
    primaryError = new Error("bajus.org page returned no usable rows");
  } catch (err) {
    primaryError = err;
  }

  if (!env.BAJUS_FALLBACK_URL) throw primaryError;

  logger.warn({ err: primaryError }, "bajus.org unavailable, falling back to bajusrate.com");
  const rows = feedToRateRows(await fetchBajusFeed());
  return { rows, source: "bajusrate.com" };
}

module.exports = { fetchBajusHtml, toRateRows, fetchBajusFeed, feedToRateRows, fetchRateRows, GRAMS_PER_BHORI };
