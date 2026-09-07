const asyncHandler = require("../../utils/async-handler");
const HttpError = require("../../utils/http-error");
const metalRateRepo = require("../../repositories/metal-rate.repository");
const rateSyncJob = require("../../jobs/rate-sync.job");
const fxSyncJob = require("../../jobs/fx-sync.job");

/**
 * BAJUS publishes 22K/21K/18K/সনাতন — not 24K fine gold — so there's no real
 * "fine gold" reading to expose. Both frontends anchor their product/fee math
 * on the real 22K grade directly (see lib/products.ts, gold-rate-card.tsx,
 * etc.) rather than a back-solved 24K figure that was never actual market
 * data.
 */
function toRealGrade(rate) {
  return {
    pricePerGramBDT: rate.pricePerGramBDT,
    pricePerBhoriBDT: rate.pricePerBhoriBDT,
    karat: rate.karat,
    effectiveAt: rate.effectiveAt,
    // BAJUS's own "last updated" timestamp — how stale their published
    // figure is, not when wallet_server last talked to them.
    reportedAt: rate.reportedAt,
    // When wallet_server actually last pulled from BAJUS (cron tick or a
    // "sync now" click), regardless of whether BAJUS's own number moved.
    // This is what the client's "synced Xh ago" caption should read.
    syncedAt: rateSyncJob.getLastSyncedAt()?.toISOString() ?? null,
  };
}

function parseKarat(req) {
  const { karat } = req.query;
  if (karat === undefined) return null;
  if (!metalRateRepo.KARATS.includes(karat)) {
    throw new HttpError(400, `Unknown karat "${karat}" — expected one of ${metalRateRepo.KARATS.join(", ")}`);
  }
  return karat;
}

// No karat in the query means "the platform's anchor grade" — 22K, the real
// figure everything else (product/fee math, the wallet's headline price)
// prices off, not a derived 24K/"fine" number.
const ANCHOR_KARAT = "22k";

const getRate = (metal) =>
  asyncHandler(async (req, res) => {
    const karat = parseKarat(req) ?? ANCHOR_KARAT;
    const rate = await metalRateRepo.getLatest(metal, karat);
    if (!rate) throw new HttpError(404, `No ${metal} ${karat} rate available yet`);
    res.json({ success: true, data: toRealGrade(rate) });
  });

const getRateHistory = (metal) =>
  asyncHandler(async (req, res) => {
    const karat = parseKarat(req) ?? ANCHOR_KARAT;
    const history = await metalRateRepo.getHistory(metal, karat);
    res.json({ success: true, data: history.map(toRealGrade) });
  });

/** The "sync now" button's endpoint — forces the same BAJUS pull the cron job
 * runs (see rate-sync.job.js), throttled there against being mashed. Not
 * behind requireAuth: this repo's client proxy layer has no working
 * Bearer-forwarding yet (see /api/auth/* stubs), so this matches every other
 * rate endpoint here in being open, with the cooldown as the abuse guard. */
const syncRates = asyncHandler(async (req, res) => {
  await rateSyncJob.triggerManualSync();
  res.json({ success: true, data: { syncedAt: rateSyncJob.getLastSyncedAt() } });
});

/** BDT-per-unit quotes for the wallet's currency-conversion card. 404s only
 * until the very first poll (started at process boot) lands; after that it
 * always has at least a stale-but-real quote to serve, since a failed poll
 * never clears the cache. */
const getFxRates = asyncHandler(async (req, res) => {
  const ratesPerUnit = fxSyncJob.getRates();
  if (!ratesPerUnit) throw new HttpError(404, "No FX rates available yet");
  res.json({
    success: true,
    data: {
      base: "BDT",
      ratesPerUnit,
      syncedAt: fxSyncJob.getLastSyncedAt()?.toISOString() ?? null,
    },
  });
});

module.exports = { getRate, getRateHistory, syncRates, getFxRates };
