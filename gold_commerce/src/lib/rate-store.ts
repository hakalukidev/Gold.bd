import type { Metal } from "@/lib/mock-rates";
import type { Karat } from "@/types";
import { scrapeBajusRates } from "./bajus-scraper";
import { upsertRate, getLatest as repoGetLatest, getHistory as repoGetHistory, type RateSummary } from "./metal-rate-repository";

export type { RateSummary };

/**
 * This app's own gold/silver rate history — scraped straight from bajus.org
 * (see bajus-scraper.ts) instead of proxying gold_wallet/server, so the
 * storefront's prices keep working even if gold_wallet is down. Persisted in
 * this app's own Postgres database (see metal-rate-repository.ts /
 * scripts/db/migrations/0004_create_metal_rates.sql), the same
 * upsert-by-day shape gold_wallet/server's metal_rates table uses — not an
 * in-memory cache, so a poll's readings survive dev-mode reloads and server
 * restarts instead of resetting to empty on every one.
 */
export async function getLatest(metal: Metal, karat: Karat): Promise<RateSummary | null> {
  return repoGetLatest(metal, karat);
}

export async function getHistory(metal: Metal, karat: Karat): Promise<RateSummary[]> {
  return repoGetHistory(metal, karat);
}

// Tracked on globalThis (not a plain module binding) purely so the bootstrap
// retry below survives Next.js dev-mode module re-evaluation — the rate data
// itself no longer needs that treatment now that it lives in Postgres.
declare global {
  var __bajusRateSyncStarted: boolean | undefined;
  var __bajusRateEverSynced: boolean | undefined;
}

/** Scrapes bajus.org once and upserts today's (metal, karat) readings it
 * carries. A failed poll is logged and leaves the existing rows in place —
 * a stale-but-real reading beats none at all. */
export async function syncOnce(): Promise<void> {
  const rows = await scrapeBajusRates();
  if (rows.length === 0) {
    console.warn("BAJUS sync: page returned no usable rows");
    return;
  }
  for (const row of rows) {
    await upsertRate(row.metal, {
      pricePerGramBDT: row.pricePerGramBDT,
      pricePerBhoriBDT: row.pricePerBhoriBDT,
      karat: row.karat,
      effectiveAt: row.effectiveAt,
      reportedAt: row.reportedAt,
    });
  }
  globalThis.__bajusRateEverSynced = true;
}

const SYNC_INTERVAL_MINUTES = Number(process.env.RATE_SYNC_INTERVAL_MINUTES ?? 10);

// If the site has never synced successfully yet, a single transient failure
// (bajus.org hiccup, timeout) shouldn't leave every rate/chart on the
// storefront stuck showing "no data" until the next full interval — retry
// soon instead. Once one sync has landed, back off to the normal cadence.
const BOOTSTRAP_RETRY_MS = 30_000;

function startRateSync(): void {
  if (globalThis.__bajusRateSyncStarted) return;
  globalThis.__bajusRateSyncStarted = true;

  const runSync = () => {
    syncOnce()
      .catch((err) => console.error("BAJUS rate sync failed", err))
      .finally(() => {
        if (!globalThis.__bajusRateEverSynced) setTimeout(runSync, BOOTSTRAP_RETRY_MS).unref();
      });
  };
  runSync();

  const timer = setInterval(() => {
    syncOnce().catch((err) => console.error("BAJUS rate sync failed", err));
  }, SYNC_INTERVAL_MINUTES * 60_000);
  timer.unref();
}

startRateSync();
