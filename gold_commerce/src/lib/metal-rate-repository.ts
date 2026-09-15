import { randomUUID } from "node:crypto";
import { pool } from "./db";
import type { Metal } from "@/lib/mock-rates";
import type { Karat } from "@/types";

/**
 * Postgres-backed metal_rates table — this app's own database (see db.ts),
 * separate from gold_wallet's. Mirrors gold_wallet/server's
 * metal-rate.repository.js schema and upsert-by-day semantics 1:1 (see
 * scripts/db/migrations/0004_create_metal_rates.sql) so a rate synced here
 * survives dev-mode reloads and server restarts instead of living only in a
 * process-lifetime in-memory cache.
 */
export interface RateRow {
  pricePerGramBDT: string;
  pricePerBhoriBDT: string;
  karat: Karat;
  effectiveAt: Date;
  reportedAt: Date | null;
}

export type RateSource = "bajus" | "manual";

export interface RateSummary {
  pricePerGramBDT: string;
  pricePerBhoriBDT: string;
  karat: Karat;
  effectiveAt: string;
  reportedAt: string | null;
  source: RateSource;
}

/** A manually-set rate, as shown in the admin panel's history table —
 * unlike RateSummary this carries `metal` too since the admin list spans
 * both gold and silver. */
export interface ManualRateEntry extends RateSummary {
  metal: Metal;
}

interface MetalRateDbRow {
  metal: Metal;
  price_per_gram_bdt: string;
  price_per_bhori_bdt: string;
  karat: Karat;
  effective_at: Date;
  reported_at: Date | null;
  source: RateSource;
}

function toSummary(row: MetalRateDbRow): RateSummary {
  return {
    pricePerGramBDT: row.price_per_gram_bdt,
    pricePerBhoriBDT: row.price_per_bhori_bdt,
    karat: row.karat,
    effectiveAt: row.effective_at.toISOString(),
    reportedAt: row.reported_at ? row.reported_at.toISOString() : null,
    source: row.source,
  };
}

function toManualEntry(row: MetalRateDbRow): ManualRateEntry {
  return { ...toSummary(row), metal: row.metal };
}

/** Inserts a reading, or — if one already exists for this (metal, karat, day)
 * — overwrites it. Lets the sync job re-run over the same day (including
 * "today", which is fetched again on every poll) without piling up duplicate
 * rows.
 *
 * `source` defaults to the automatic "bajus" sync. An admin's manual entry
 * (source "manual") is stamped with `effectiveAt: now()` rather than
 * midnight of the report day, so it naturally outranks that same day's bajus
 * row in getLatest()'s ORDER BY — no separate "override" flag needed — until
 * the next day's real bajus reading (midnight, but a day later) overtakes it. */
export async function upsertRate(metal: Metal, row: RateRow, source: RateSource = "bajus"): Promise<void> {
  await pool.query(
    `INSERT INTO metal_rates (id, metal, karat, price_per_gram_bdt, price_per_bhori_bdt, source, reported_at, effective_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (metal, karat, effective_at) DO UPDATE
       SET price_per_gram_bdt  = EXCLUDED.price_per_gram_bdt,
           price_per_bhori_bdt = EXCLUDED.price_per_bhori_bdt,
           source              = EXCLUDED.source,
           reported_at         = COALESCE(EXCLUDED.reported_at, metal_rates.reported_at)`,
    [randomUUID(), metal, row.karat, row.pricePerGramBDT, row.pricePerBhoriBDT, source, row.reportedAt, row.effectiveAt]
  );
}

export async function getLatest(metal: Metal, karat: Karat): Promise<RateSummary | null> {
  const { rows } = await pool.query<MetalRateDbRow>(
    `SELECT * FROM metal_rates WHERE metal = $1 AND karat = $2 ORDER BY effective_at DESC LIMIT 1`,
    [metal, karat]
  );
  return rows[0] ? toSummary(rows[0]) : null;
}

const HISTORY_LIMIT = 400;

/** Oldest first, capped at HISTORY_LIMIT most recent readings — enough to
 * cover every range a chart on this site offers. */
export async function getHistory(metal: Metal, karat: Karat): Promise<RateSummary[]> {
  const { rows } = await pool.query<MetalRateDbRow>(
    `SELECT * FROM (
       SELECT * FROM metal_rates WHERE metal = $1 AND karat = $2 ORDER BY effective_at DESC LIMIT $3
     ) recent
     ORDER BY effective_at ASC`,
    [metal, karat, HISTORY_LIMIT]
  );
  return rows.map(toSummary);
}

const MANUAL_HISTORY_LIMIT = 100;

/** Every admin-set rate (both metals, all karats), newest first — backs the
 * admin panel's "Rate history" table. */
export async function getManualHistory(limit = MANUAL_HISTORY_LIMIT): Promise<ManualRateEntry[]> {
  const { rows } = await pool.query<MetalRateDbRow>(
    `SELECT * FROM metal_rates WHERE source = 'manual' ORDER BY effective_at DESC LIMIT $1`,
    [limit]
  );
  return rows.map(toManualEntry);
}
