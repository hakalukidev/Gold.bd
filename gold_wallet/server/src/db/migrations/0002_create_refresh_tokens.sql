-- Refresh tokens are stored as a SHA-256 hash, never in plaintext, so a database
-- leak alone cannot be used to impersonate a session.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id                     UUID PRIMARY KEY,
  user_id                UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash             CHAR(64) NOT NULL UNIQUE,
  replaced_by_token_hash CHAR(64),
  user_agent             TEXT,
  ip_address             VARCHAR(64),
  expires_at             TIMESTAMPTZ NOT NULL,
  revoked_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
