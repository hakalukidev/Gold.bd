-- otp_challenges.payload holds {fullName, email, passwordHash} for a pending
-- registration — the passwordHash is already bcrypt-hashed, but fullName/
-- email are plaintext PII sitting in the table until the OTP is consumed or
-- expires. Encrypts that blob; see otp-challenge.repository.js and
-- 0015_drop_plaintext_otp_payload.sql.
ALTER TABLE otp_challenges
  ADD COLUMN IF NOT EXISTS payload_enc JSONB,
  ADD COLUMN IF NOT EXISTS key_version SMALLINT;
