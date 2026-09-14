const asyncHandler = require("../../utils/async-handler");
const HttpError = require("../../utils/http-error");
const { updateSettingsSchema } = require("./admin.validation");
const platformSettingsRepo = require("../../repositories/platform-settings.repository");
const userRepo = require("../../repositories/user.repository");
const ledgerRepo = require("../../repositories/ledger.repository");
const kycRepo = require("../../repositories/kyc.repository");
const giftCoinRepo = require("../../repositories/gift-coin-order.repository");
const collectRepo = require("../../repositories/collect-order.repository");

const getSettings = asyncHandler(async (req, res) => {
  const settings = await platformSettingsRepo.getFeeSettings();
  res.status(200).json({ success: true, data: settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const result = updateSettingsSchema.safeParse(req.body);
  if (!result.success) {
    throw new HttpError(400, "Invalid input", result.error.flatten().fieldErrors);
  }
  const settings = await platformSettingsRepo.updateFeeSettings(result.data, req.userId);
  res.status(200).json({ success: true, data: settings });
});

const getUsers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const [users, total] = await Promise.all([
    userRepo.listAll({ search, limit, offset }),
    userRepo.countAll({ search }),
  ]);
  res.json({ success: true, data: users, meta: { total, limit, offset } });
});

/** One bucket per calendar day (UTC) a trade landed in — grouping happens
 * here rather than in SQL because ledger amounts are encrypted (see
 * ledger.repository.js#adminListTrades) and can't be SUM()'d by Postgres. */
function bucketTradesByDay(entries) {
  const byDate = new Map();
  for (const entry of entries) {
    const date = entry.createdAt.slice(0, 10);
    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        buyGoldGrams: 0,
        buyGoldBDT: 0,
        sellGoldGrams: 0,
        sellGoldBDT: 0,
        buySilverGrams: 0,
        buySilverBDT: 0,
        sellSilverGrams: 0,
        sellSilverBDT: 0,
        buyCount: 0,
        sellCount: 0,
      });
    }
    const bucket = byDate.get(date);
    const metalKey = entry.metal === "silver" ? "Silver" : "Gold";
    const grams = Number(entry.metal === "silver" ? entry.silverGrams : entry.goldGrams) || 0;
    const bdt = Number(entry.totalAmountBDT) || 0;
    if (entry.type === "BUY") {
      bucket[`buy${metalKey}Grams`] += grams;
      bucket[`buy${metalKey}BDT`] += bdt;
      bucket.buyCount += 1;
    } else {
      bucket[`sell${metalKey}Grams`] += grams;
      bucket[`sell${metalKey}BDT`] += bdt;
      bucket.sellCount += 1;
    }
  }
  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => ({
      ...b,
      buyGoldGrams: b.buyGoldGrams.toFixed(4),
      buyGoldBDT: b.buyGoldBDT.toFixed(2),
      sellGoldGrams: b.sellGoldGrams.toFixed(4),
      sellGoldBDT: b.sellGoldBDT.toFixed(2),
      buySilverGrams: b.buySilverGrams.toFixed(4),
      buySilverBDT: b.buySilverBDT.toFixed(2),
      sellSilverGrams: b.sellSilverGrams.toFixed(4),
      sellSilverBDT: b.sellSilverBDT.toFixed(2),
    }));
}

const getTradeReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const entries = await ledgerRepo.adminListTrades({ from, to });
  res.json({ success: true, data: bucketTradesByDay(entries) });
});

const getDashboard = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [userCount, pendingKyc, pendingGiftCoins, pendingCollect, recentTrades] = await Promise.all([
    userRepo.countAll(),
    kycRepo.listByStatus({ status: "PENDING", limit: 200, offset: 0 }),
    giftCoinRepo.listByStatus({ status: "PENDING", limit: 200, offset: 0 }),
    collectRepo.listByStatus({ status: "PENDING", limit: 200, offset: 0 }),
    ledgerRepo.adminListTrades({ from: thirtyDaysAgo }),
  ]);

  const daily = bucketTradesByDay(recentTrades);
  const totals = daily.reduce(
    (acc, d) => ({
      buyGoldBDT: acc.buyGoldBDT + Number(d.buyGoldBDT),
      sellGoldBDT: acc.sellGoldBDT + Number(d.sellGoldBDT),
      buySilverBDT: acc.buySilverBDT + Number(d.buySilverBDT),
      sellSilverBDT: acc.sellSilverBDT + Number(d.sellSilverBDT),
    }),
    { buyGoldBDT: 0, sellGoldBDT: 0, buySilverBDT: 0, sellSilverBDT: 0 }
  );

  res.json({
    success: true,
    data: {
      userCount,
      pendingKycCount: pendingKyc.length,
      pendingGiftCoinCount: pendingGiftCoins.length,
      pendingCollectCount: pendingCollect.length,
      last30Days: {
        buyGoldBDT: totals.buyGoldBDT.toFixed(2),
        sellGoldBDT: totals.sellGoldBDT.toFixed(2),
        buySilverBDT: totals.buySilverBDT.toFixed(2),
        sellSilverBDT: totals.sellSilverBDT.toFixed(2),
      },
      dailyTrades: daily,
    },
  });
});

module.exports = { getSettings, updateSettings, getUsers, getTradeReport, getDashboard };
