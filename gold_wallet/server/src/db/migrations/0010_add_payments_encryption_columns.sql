-- Encrypts the customer PII and raw gateway payload this table has held in
-- plaintext since 0006 — customer_enc packs {name, email, phone} into one
-- encrypted blob, gateway_response_enc replaces the plaintext gateway_response
-- (which may carry card/bank metadata from SSLCommerz). See
-- payment.repository.js and 0014_drop_plaintext_payments_columns.sql, which
-- removes the plaintext columns after scripts/backfill-encrypt.js runs.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS customer_enc         JSONB,
  ADD COLUMN IF NOT EXISTS gateway_response_enc JSONB,
  ADD COLUMN IF NOT EXISTS key_version          SMALLINT;
