const env = require("../../config/env");
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

module.exports = { fetchBajusHtml, toRateRows, GRAMS_PER_BHORI };
