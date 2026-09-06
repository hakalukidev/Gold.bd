const pool = require("../db/pool");

const KARATS = ["22k", "21k", "18k", "sonaton"];

function toSummary(row) {
  if (!row) return null;
  return {
    pricePerGramBDT: row.price_per_gram_bdt,
    pricePerBhoriBDT: row.price_per_bhori_bdt,
    karat: row.karat,
    effectiveAt: row.effective_at.toISOString(),
    reportedAt: row.reported_at ? row.reported_at.toISOString() : null,
  };
}

/** Inserts a reading, or — if one already exists for this (metal, karat, day)
 * — overwrites it. Lets the sync job re-run over the same day (including
 * "today", which is fetched again on every poll) without piling up duplicate
 * rows. */
async function upsertRate({ id, metal, karat, pricePerGramBDT, pricePerBhoriBDT, source, reportedAt, effectiveAt }) {
  await pool.query(
    `INSERT INTO metal_rates (id, metal, karat, price_per_gram_bdt, price_per_bhori_bdt, source, reported_at, effective_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (metal, karat, effective_at) DO UPDATE
       SET price_per_gram_bdt  = EXCLUDED.price_per_gram_bdt,
           price_per_bhori_bdt = EXCLUDED.price_per_bhori_bdt,
           source              = EXCLUDED.source,
           reported_at         = COALESCE(EXCLUDED.reported_at, metal_rates.reported_at)`,
    [id, metal, karat, pricePerGramBDT, pricePerBhoriBDT, source, reportedAt, effectiveAt]
  );
}

async function getLatest(metal, karat) {
  const { rows } = await pool.query(
    `SELECT * FROM metal_rates WHERE metal = $1 AND karat = $2 ORDER BY effective_at DESC LIMIT 1`,
    [metal, karat]
  );
  return toSummary(rows[0]);
}

/** Oldest first, capped at `limit` most recent readings — enough to cover
 * every range a chart on either frontend offers. */
async function getHistory(metal, karat, limit = 400) {
  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT * FROM metal_rates WHERE metal = $1 AND karat = $2 ORDER BY effective_at DESC LIMIT $3
     ) recent
     ORDER BY effective_at ASC`,
    [metal, karat, limit]
  );
  return rows.map(toSummary);
}

module.exports = { upsertRate, getLatest, getHistory, KARATS };
