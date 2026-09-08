const pool = require("../db/pool");
const HttpError = require("../utils/http-error");

/** DB key -> camelCase field name, and the default value that applies until
 * an admin saves an override (see 0017_create_platform_settings.sql — the
 * table starts empty on purpose). These defaults are the same numbers
 * fee-calculator.js used to hardcode. */
const FEE_SETTINGS = {
  transaction_charge_rate: { field: "transactionChargeRate", default: 0.015 },
  govt_gold_tax_per_bhori_bdt: { field: "govtGoldTaxPerBhoriBdt", default: 2500 },
  sell_spread_rate: { field: "sellSpreadRate", default: 0.02 },
};

const FEE_KEYS = Object.keys(FEE_SETTINGS);

/** Current fee/tax settings, DB overrides merged onto the defaults above. */
async function getFeeSettings() {
  const { rows } = await pool.query("SELECT key, value, updated_at FROM platform_settings WHERE key = ANY($1)", [
    FEE_KEYS,
  ]);

  const result = {};
  let updatedAt = null;
  for (const [key, { field, default: def }] of Object.entries(FEE_SETTINGS)) {
    const row = rows.find((r) => r.key === key);
    result[field] = row ? Number(row.value) : def;
    if (row && (!updatedAt || row.updated_at > updatedAt)) updatedAt = row.updated_at;
  }
  result.updatedAt = updatedAt;
  return result;
}

/** Upserts whichever of the three fee keys are present in `partial` (already
 * validated by admin.validation.js), stamping who changed it. */
async function updateFeeSettings(partial, adminUserId) {
  const fieldToKey = Object.fromEntries(Object.entries(FEE_SETTINGS).map(([key, v]) => [v.field, key]));

  const entries = Object.entries(partial).filter(([, value]) => value !== undefined);
  if (entries.length === 0) throw new HttpError(400, "No settings provided");

  for (const [field, value] of entries) {
    const key = fieldToKey[field];
    if (!key) throw new HttpError(400, `Unknown setting "${field}"`);
    await pool.query(
      `INSERT INTO platform_settings (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = now()`,
      [key, value, adminUserId]
    );
  }

  return getFeeSettings();
}

module.exports = { getFeeSettings, updateFeeSettings };
