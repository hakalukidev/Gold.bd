-- One row per (metal, karat, day): BAJUS publishes four karat grades for each
-- of gold and silver (22k/21k/18k/sonaton), so a "rate" is really eight numbers
-- a day, not one. price_per_gram_bdt is the figure BAJUS reports directly;
-- price_per_bhori_bdt is that times 11.664 (1 bhori/vori = 11.664g), stored
-- rather than computed on every read since it's shown as often as the gram
-- price is.
CREATE TABLE IF NOT EXISTS metal_rates (
  id                   UUID PRIMARY KEY,
  metal                VARCHAR(10) NOT NULL CHECK (metal IN ('gold', 'silver')),
  karat                VARCHAR(10) NOT NULL CHECK (karat IN ('22k', '21k', '18k', 'sonaton')),
  price_per_gram_bdt   NUMERIC(12, 4) NOT NULL,
  price_per_bhori_bdt  NUMERIC(12, 2) NOT NULL,
  source               VARCHAR(20) NOT NULL DEFAULT 'bajus',
  -- When BAJUS itself reported this figure (their `last_updated`); NULL for
  -- rows backfilled from `history`, which only carries a date.
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
