const crypto = require("node:crypto");
const env = require("../config/env");
const logger = require("../utils/logger");
const { sendSms } = require("../utils/sms");
const HttpError = require("../utils/http-error");
const metalRateRepo = require("../repositories/metal-rate.repository");
const { fetchRateRows } = require("../modules/rates/bajus.service");

let timer = null;

// When this last actually ran, whether that was the cron tick above or the
// "sync now" button — one clock either way answers "when did we last hear
// from BAJUS" for the client.
let lastSyncedAt = null;

/** Fetches BAJUS rates once (bajus.org, or the bajusrate.com feed if that's
 * blocked — see bajus.service.js), upserts the (metal, karat) readings, and,
 * if the headline 22K gold rate moved since the last sync, texts
 * ADMIN_ALERT_PHONE. */
async function syncOnce() {
  const previous22kGold = await metalRateRepo.getLatest("gold", "22k");

  const { rows, source } = await fetchRateRows();
  if (rows.length === 0) {
    logger.warn({ source }, "BAJUS sync: source returned no usable rows");
    return;
  }

  for (const row of rows) {
    await metalRateRepo.upsertRate({ id: crypto.randomUUID(), ...row });
  }
  lastSyncedAt = new Date();

  // Rows are newest-first from either source, so the first 22K gold row is
  // the latest reading even when the feed's history backfill is included.
  const latest22kGold = rows.find((r) => r.metal === "gold" && r.karat === "22k");
  logger.info({ source, rows: rows.length, latest22kGold: latest22kGold?.pricePerGramBDT }, "BAJUS rate sync complete");

  if (
    env.ADMIN_ALERT_PHONE &&
    latest22kGold &&
    previous22kGold &&
    Number(previous22kGold.pricePerGramBDT) !== Number(latest22kGold.pricePerGramBDT)
  ) {
    const message = `Gold 22K rate changed: ৳${previous22kGold.pricePerGramBDT} -> ৳${latest22kGold.pricePerGramBDT} per gram`;
    await sendSms(env.ADMIN_ALERT_PHONE, message).catch((err) =>
      logger.error({ err }, "Failed to send rate-change alert SMS")
    );
  }
}

/** Runs an initial sync immediately, then every RATE_SYNC_INTERVAL_MINUTES.
 * A failed poll is logged and never crashes the process — the next tick just
 * tries again. */
function start() {
  syncOnce().catch((err) => logger.error({ err }, "Initial BAJUS rate sync failed"));
  timer = setInterval(() => {
    syncOnce().catch((err) => logger.error({ err }, "BAJUS rate sync failed"));
  }, env.RATE_SYNC_INTERVAL_MINUTES * 60_000);
  timer.unref();
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

function getLastSyncedAt() {
  return lastSyncedAt;
}

const MANUAL_SYNC_COOLDOWN_MS = 30_000;

/** The "sync now" button's entry point — runs the same syncOnce() the cron
 * tick does, so "last synced" always means a real BAJUS pull happened,
 * whichever triggered it. Throttled so the button can't be mashed into
 * hammering BAJUS's API. */
async function triggerManualSync() {
  if (lastSyncedAt) {
    const elapsedMs = Date.now() - lastSyncedAt.getTime();
    if (elapsedMs < MANUAL_SYNC_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((MANUAL_SYNC_COOLDOWN_MS - elapsedMs) / 1000);
      throw new HttpError(429, `Already synced recently — try again in ${retryAfterSeconds}s`);
    }
  }
  await syncOnce();
  return lastSyncedAt;
}

module.exports = { start, stop, syncOnce, getLastSyncedAt, triggerManualSync };
