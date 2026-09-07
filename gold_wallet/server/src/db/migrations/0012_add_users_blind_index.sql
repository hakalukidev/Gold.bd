-- Encrypts users.phone/email while keeping them exact-match lookupable via a
-- deterministic HMAC "blind index" column — AES-GCM's random IV means the
-- same phone number never encrypts to the same ciphertext twice, so the
-- ciphertext itself can't be the lookup/uniqueness key the way the plaintext
-- column was. Login/registration/OTP queries move from `WHERE phone = $1` to
-- `WHERE phone_hmac = $1` (computed in user.repository.js, never the raw
-- value sent to SQL). See 0016_drop_plaintext_users_pii.sql, which removes
-- the plaintext columns (and their old unique constraints) once
-- scripts/backfill-encrypt.js has populated every row.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_enc   JSONB,
  ADD COLUMN IF NOT EXISTS phone_hmac  CHAR(64),
  ADD COLUMN IF NOT EXISTS email_enc   JSONB,
  ADD COLUMN IF NOT EXISTS email_hmac  CHAR(64),
  ADD COLUMN IF NOT EXISTS key_version SMALLINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_hmac ON users (phone_hmac);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_hmac ON users (email_hmac) WHERE email_hmac IS NOT NULL;
