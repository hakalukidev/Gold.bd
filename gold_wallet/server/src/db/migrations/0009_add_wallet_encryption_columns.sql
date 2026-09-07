-- Adds encrypted balance storage + a tamper-evidence checksum alongside the
-- existing plaintext balance columns. `version` is a plain app-managed
-- counter (not a timestamp) the checksum is computed over, so verifying it
-- never depends on comparing a JS-side clock reading to a DB-side `now()`.
--
-- wallet.repository.js writes/reads only these new columns from here on.
-- scripts/backfill-encrypt.js populates them for any row that predates this
-- migration; 0013_drop_plaintext_wallet_columns.sql removes the old
-- plaintext columns once that backfill has run.
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS cash_balance_enc   JSONB,
  ADD COLUMN IF NOT EXISTS gold_balance_enc   JSONB,
  ADD COLUMN IF NOT EXISTS silver_balance_enc JSONB,
  ADD COLUMN IF NOT EXISTS key_version        SMALLINT,
  ADD COLUMN IF NOT EXISTS balance_checksum   CHAR(64),
  ADD COLUMN IF NOT EXISTS version            INTEGER NOT NULL DEFAULT 0;
