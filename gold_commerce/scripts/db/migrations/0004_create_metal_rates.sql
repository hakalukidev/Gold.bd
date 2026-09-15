-- One row per (metal, karat, day): BAJUS publishes four karat grades for each
-- of gold and silver (22k/21k/18k/sonaton), so a "rate" is really eight numbers
-- a day, not one. price_per_gram_bdt is the figure BAJUS reports directly;
-- price_per_bhori_bdt is that times 11.664 (1 bhori/vori = 11.664g), stored
-- rather than computed on every read since it's shown as often as the gram
-- price is. Mirrors gold_wallet/server's own metal_rates table (see
-- gold_wallet/server/src/db/migrations/0004_create_metal_rates.sql) — same
-- shape, separate database, so this app has no runtime dependency on
-- gold_wallet being up.
CREATE TABLE IF NOT EXISTS metal_rates (
  id                   UUID PRIMARY KEY,
  metal                VARCHAR(10) NOT NULL CHECK (metal IN ('gold', 'silver')),
  karat                VARCHAR(10) NOT NULL CHECK (karat IN ('22k', '21k', '18k', 'sonaton')),
  price_per_gram_bdt   NUMERIC(12, 4) NOT NULL,
  price_per_bhori_bdt  NUMERIC(12, 2) NOT NULL,
  source               VARCHAR(20) NOT NULL DEFAULT 'bajus',
  -- When BAJUS itself reported this figure (parsed off their "View In PDF"
  -- link); NULL when that link was missing and effective_at fell back to now().
  reported_at          TIMESTAMPTZ,
  -- The calendar day this rate is effective for — the natural key alongside
  -- (metal, karat): a sync re-run for the same day updates the row instead of
  -- appending a duplicate.
  effective_at         TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_metal_rates_unique_reading
  ON metal_rates (metal, karat, effective_at);

CREATE INDEX IF NOT EXISTS idx_metal_rates_latest
  ON metal_rates (metal, karat, effective_at DESC);
