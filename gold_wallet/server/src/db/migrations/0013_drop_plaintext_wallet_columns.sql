-- Cutover complete (see scripts/backfill-encrypt.js) — every wallets row now
-- has its encrypted counterpart, so the plaintext balance columns can go.
-- "Balance never goes negative" moves from these columns' CHECK constraints
-- to application code (wallet.repository.js#applyDelta) since Postgres can't
-- CHECK an encrypted value.
ALTER TABLE wallets
  DROP COLUMN cash_balance_bdt,
  DROP COLUMN gold_balance_grams,
  DROP COLUMN silver_balance_grams,
  ALTER COLUMN cash_balance_enc SET NOT NULL,
  ALTER COLUMN gold_balance_enc SET NOT NULL,
  ALTER COLUMN silver_balance_enc SET NOT NULL,
  ALTER COLUMN key_version SET NOT NULL,
  ALTER COLUMN balance_checksum SET NOT NULL;
