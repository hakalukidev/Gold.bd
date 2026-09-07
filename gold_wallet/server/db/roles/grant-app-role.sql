-- Least-privilege DB role split for production. This is a deliverable
-- script, not something the app runs itself — apply it manually against
-- your production Postgres instance (as a superuser/owner) once, then point
-- MIGRATE_DATABASE_URL and DATABASE_URL (see .env.example) at the two roles
-- it creates.
--
-- Today, DATABASE_URL is used for both schema migrations (DDL) and normal
-- request handling (DML) — usually via the same owner-level role. That means
-- a bug or compromise in request-handling code (a SQL injection that somehow
-- got past parameterized queries, a leaked connection string, ...) has DDL
-- rights it never needs: it could DROP TABLE, ALTER a CHECK constraint away,
-- or — the specific risk this schema cares about — UPDATE/DELETE a supposedly
-- append-only ledger_entries row.
--
-- Usage:
--   psql "$DATABASE_URL" -f db/roles/grant-app-role.sql
-- then set:
--   MIGRATE_DATABASE_URL = the existing owner/superuser connection string (DDL)
--   DATABASE_URL         = postgres://gold_wallet_app:<password>@host:5432/gold_wallet (DML only)
-- and update src/db/migrate.js's `pool` require to read MIGRATE_DATABASE_URL
-- (falls back to DATABASE_URL today, which is correct for local dev — no
-- action needed there until you actually split roles in an environment).

-- Replace with a real, generated password before running against production.
\set app_password 'CHANGE_ME_BEFORE_RUNNING'

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gold_wallet_app') THEN
    CREATE ROLE gold_wallet_app LOGIN PASSWORD :'app_password';
  END IF;
END
$$;

-- Connect to the target database first (`\c gold_wallet`) if this script
-- isn't already running against it.
GRANT CONNECT ON DATABASE gold_wallet TO gold_wallet_app;
GRANT USAGE ON SCHEMA public TO gold_wallet_app;

-- Normal DML on every application table...
GRANT SELECT, INSERT, UPDATE, DELETE ON
  users, refresh_tokens, otp_challenges, metal_rates, payments, wallets, schema_migrations
  TO gold_wallet_app;

-- ...except ledger_entries, which the app should only ever be able to append
-- to. This is the actual enforcement of "no one can change the ledger" —
-- everything else (the checksum, the hash chain) only *detects* tampering
-- after the fact; this is what prevents the app's own runtime role from
-- doing it in the first place. (Direct superuser/owner access can still
-- bypass this, same as any DB permission model — the hash chain is the
-- backstop for that case.)
GRANT SELECT, INSERT ON ledger_entries TO gold_wallet_app;
REVOKE UPDATE, DELETE, TRUNCATE ON ledger_entries FROM gold_wallet_app;

-- No DDL rights at all: can't create/alter/drop tables, run migrations, or
-- grant itself more access.
REVOKE CREATE ON SCHEMA public FROM gold_wallet_app;

-- Sequences/defaults: every id column here is a UUID generated in
-- application code (crypto.randomUUID()), not a DB sequence, so no
-- USAGE ON SEQUENCE grants are needed.
