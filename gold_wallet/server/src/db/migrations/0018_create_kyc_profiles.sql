-- One row per user (a resubmission after a REJECTED review overwrites it in
-- place and resets it back to PENDING — see kyc.repository.js#upsert), not a
-- history table, mirroring how users.kyc_status is a single current value.
-- nid_number is encrypted the same way as users.phone/email (see
-- security/crypto.js): nid_number_enc holds the AES-GCM envelope,
-- nid_number_hmac is a deterministic blind index so the same NID can't be
-- registered against two different accounts. Document images themselves live
-- on disk (see modules/kyc/kyc.storage.js) — only their generated filenames
-- are stored here, never served as public URLs.
CREATE TABLE IF NOT EXISTS kyc_profiles (
  id                UUID PRIMARY KEY,
  user_id           UUID NOT NULL UNIQUE REFERENCES users(id),
  full_name         VARCHAR(100) NOT NULL,
  dob               DATE,
  nid_number_enc    JSONB NOT NULL,
  nid_number_hmac   CHAR(64) NOT NULL,
  key_version       SMALLINT NOT NULL,
  nid_front_path    TEXT NOT NULL,
  nid_back_path     TEXT NOT NULL,
  selfie_path       TEXT NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reject_reason     TEXT,
  reviewed_by       UUID REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_profiles_nid_hmac ON kyc_profiles (nid_number_hmac);
CREATE INDEX IF NOT EXISTS idx_kyc_profiles_status ON kyc_profiles (status);
