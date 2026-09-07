CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY,
  full_name             VARCHAR(100) NOT NULL,
  phone                 VARCHAR(20) NOT NULL UNIQUE,
  email                 VARCHAR(255) UNIQUE,
  password_hash         TEXT NOT NULL,
  role                  VARCHAR(10) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  kyc_status            VARCHAR(20) NOT NULL DEFAULT 'NOT_SUBMITTED'
                          CHECK (kyc_status IN ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED')),
  is_active             BOOLEAN NOT NULL DEFAULT true,
  failed_login_attempts SMALLINT NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
