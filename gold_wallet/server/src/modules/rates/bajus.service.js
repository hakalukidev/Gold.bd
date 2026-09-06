const env = require("../../config/env");
const { KARATS } = require("../../repositories/metal-rate.repository");

/** 1 bhori (ভরি), also called a vori or tola = 11.664 grams = 16 ana. */
const GRAMS_PER_BHORI = 11.664;

/**
 * BAJUS reports the figures this feed carries in Asia/Dhaka local time
 * ("YYYY-MM-DD HH:mm:ss" / "YYYY-MM-DD") with no offset of its own, so both
 * parse against a fixed +06:00 rather than the server's local timezone.
 */
function parseBdDateTime(value) {
  return new Date(`${value.replace(" ", "T")}+06:00`);
}

function parseBdDate(value) {
  return new Date(`${value}T00:00:00+06:00`);
}

async function fetchBajusPayload() {
  const res = await fetch(env.BAJUS_API_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`BAJUS API responded with HTTP ${res.status}`);
  return res.json();
}

function buildRow(metal, karat, rawValue, source, reportedAt, effectiveAt) {
  const pricePerGramBDT = Number(rawValue);
  if (!Number.isFinite(pricePerGramBDT) || pricePerGramBDT <= 0) return null;
  return {
    metal,
    karat,
    pricePerGramBDT: pricePerGramBDT.toFixed(4),
    pricePerBhoriBDT: (pricePerGramBDT * GRAMS_PER_BHORI).toFixed(2),
    source,
    reportedAt,
    effectiveAt,
  };
}

/**
 * Flattens a BAJUS payload (today's `rates` plus the `history` backfill) into
 * one row per (metal, karat, day) ready for metal-rate.repository.upsertRate.
 * BAJUS's own field names (`gold_22k`, `silver_sonaton`, ...) line up exactly
 * with our karat keys, so no per-grade mapping table is needed.
 */
function toRateRows(payload) {
  const rows = [];
  const reportedAt = payload.last_updated ? parseBdDateTime(payload.last_updated) : new Date();
  const todayEffectiveAt = payload.last_updated ? parseBdDate(payload.last_updated.slice(0, 10)) : reportedAt;

  const latestGold = payload.rates?.gold_rates ?? {};
  const latestSilver = payload.rates?.silver_rates ?? {};
  for (const karat of KARATS) {
    const goldRow = buildRow("gold", karat, latestGold[`gold_${karat}`], "bajus", reportedAt, todayEffectiveAt);
    if (goldRow) rows.push(goldRow);
    const silverRow = buildRow("silver", karat, latestSilver[`silver_${karat}`], "bajus", reportedAt, todayEffectiveAt);
    if (silverRow) rows.push(silverRow);
  }

  for (const entry of payload.history ?? []) {
    if (!entry?.date) continue;
    const effectiveAt = parseBdDate(entry.date);
    for (const karat of KARATS) {
      const goldRow = buildRow("gold", karat, entry[`gold_${karat}`], "bajus", null, effectiveAt);
      if (goldRow) rows.push(goldRow);
      const silverRow = buildRow("silver", karat, entry[`silver_${karat}`], "bajus", null, effectiveAt);
      if (silverRow) rows.push(silverRow);
    }
  }

  return rows;
}

module.exports = { fetchBajusPayload, toRateRows, GRAMS_PER_BHORI };
