const express = require("express");
const { getRate, getRateHistory, syncRates, getFxRates } = require("./rate.controller");

const router = express.Router();

// Mounted at /api in app.js, so these resolve to /api/gold/rate etc — the
// same paths gold_commerce and gold_wallet/client already proxy to.
router.get("/gold/rate", getRate("gold"));
router.get("/gold/rate-history", getRateHistory("gold"));
router.get("/silver/rate", getRate("silver"));
router.get("/silver/rate-history", getRateHistory("silver"));

// One combined sync — a single BAJUS pull carries both metals (see
// bajus.service.js), so there's no separate /gold and /silver trigger.
router.post("/rates/sync", syncRates);

// Live USD/EUR/GBP/SAR → BDT quotes (see fx-sync.job.js) for the wallet's
// currency-conversion card.
router.get("/fx/rates", getFxRates);

module.exports = router;
