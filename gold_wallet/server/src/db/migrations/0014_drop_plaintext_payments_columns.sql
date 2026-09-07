-- Cutover complete (see scripts/backfill-encrypt.js) — every payments row now
-- has its encrypted counterpart.
ALTER TABLE payments
  DROP COLUMN customer_name,
  DROP COLUMN customer_email,
  DROP COLUMN customer_phone,
  DROP COLUMN gateway_response,
  ALTER COLUMN customer_enc SET NOT NULL,
  ALTER COLUMN key_version SET NOT NULL;
