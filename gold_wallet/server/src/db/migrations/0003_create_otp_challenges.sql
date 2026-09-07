-- One active challenge per (phone, purpose): a new request overwrites the
-- previous one rather than accumulating rows. The 6-digit code is stored as a
-- SHA-256 hash, never in plaintext.
CREATE TABLE IF NOT EXISTS otp_challenges (
  id          UUID PRIMARY KEY,
  phone       VARCHAR(20) NOT NULL,
  purpose     VARCHAR(10) NOT NULL CHECK (purpose IN ('REGISTER', 'LOGIN')),
  code_hash   CHAR(64) NOT NULL,
  -- REGISTER: {fullName, email, passwordHash} awaiting a verified user row.
  -- LOGIN: NULL — user_id already identifies the account.
  payload     JSONB,
  user_id     UUID REFERENCES users (id) ON DELETE CASCADE,
  attempts    SMALLINT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phone, purpose)
);
