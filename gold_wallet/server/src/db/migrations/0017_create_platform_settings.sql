-- Admin-editable platform settings, key/value so future settings (beyond
-- the initial trade fee/tax trio) don't need another migration. Deliberately
-- unseeded: platform-settings.repository.js falls back to the same hardcoded
-- defaults fee-calculator.js used to close over for any key not yet present,
-- so the app behaves identically until an admin actually saves a change.
CREATE TABLE IF NOT EXISTS platform_settings (
  key         VARCHAR(64) PRIMARY KEY,
  value       NUMERIC(14, 6) NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES users(id)
);
