-- Cutover complete (see scripts/backfill-encrypt.js).
ALTER TABLE otp_challenges
  DROP COLUMN payload;
