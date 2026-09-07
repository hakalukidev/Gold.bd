-- Cutover complete (see scripts/backfill-encrypt.js) — every users row now
-- has phone_enc/phone_hmac (and email_enc/email_hmac where applicable), and
-- every lookup query (user.repository.js) already reads through the hmac
-- columns. Dropping `phone`/`email` also drops their inline UNIQUE
-- constraints and the now-pointless idx_users_phone index along with them;
-- idx_users_phone_hmac/idx_users_email_hmac (added in 0012) are the real
-- uniqueness guard from here on.
ALTER TABLE users
  DROP COLUMN phone,
  DROP COLUMN email,
  ALTER COLUMN phone_enc SET NOT NULL,
  ALTER COLUMN phone_hmac SET NOT NULL,
  ALTER COLUMN key_version SET NOT NULL;
