const env = require("../config/env");
const logger = require("../utils/logger");
const { fetchFxPayload, toBdtPerForeignUnit } = require("../modules/rates/fx.service");

let timer = null;

// Last good BDT-per-foreign-unit quote and when it was fetched. Kept in
// memory only — unlike metal_rates there's no history/chart consumer for
// this, just "what should the currency card show right now" — so a restart
// losing the cache just means the next poll (which runs immediately, see
// start()) repopulates it.
let rates = null;
let lastSyncedAt = null;

async function syncOnce() {
  const payload = await fetchFxPayload();
  rates = toBdtPerForeignUnit(payload);
  lastSyncedAt = new Date();
  logger.info({ rates }, "FX rate sync complete");
}

/** Runs an initial sync immediately, then every FX_SYNC_INTERVAL_MINUTES. A
 * failed poll is logged and never crashes the process — getRates() just keeps
 * serving the last good quote (or null, if the very first poll hasn't landed
 * yet) until the next tick succeeds. */
function start() {
  syncOnce().catch((err) => logger.error({ err }, "Initial FX rate sync failed"));
  timer = setInterval(() => {
    syncOnce().catch((err) => logger.error({ err }, "FX rate sync failed"));
  }, env.FX_SYNC_INTERVAL_MINUTES * 60_000);
  timer.unref();
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

function getRates() {
  return rates;
}

function getLastSyncedAt() {
  return lastSyncedAt;
}

module.exports = { start, stop, syncOnce, getRates, getLastSyncedAt };
