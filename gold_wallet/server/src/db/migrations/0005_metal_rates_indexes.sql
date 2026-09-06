-- Environments that already had 0004_create_metal_rates.sql applied before it
-- carried these indexes (schema_migrations skips a migration by filename, not
-- content, so re-editing 0004 doesn't re-run it there). IF NOT EXISTS makes
-- this a no-op on a fresh install that got them from 0004 directly.
CREATE UNIQUE INDEX IF NOT EXISTS idx_metal_rates_unique_reading
  ON metal_rates (metal, karat, effective_at);

CREATE INDEX IF NOT EXISTS idx_metal_rates_latest
  ON metal_rates (metal, karat, effective_at DESC);
