-- Append-only ledger backing every wallet balance movement (BUY/SELL of gold
-- or silver, cash DEPOSIT/WITHDRAW). This is the audit trail `wallets`
-- (the fast-path mutable balance) is kept in sync with, and the source a
-- reconciliation job (src/jobs/reconcile-ledger.job.js) checks it against.
--
-- Amount fields (grams, price, fees, deltas, post-trade balance snapshots)
-- are packed into one encrypted JSON blob (amounts_enc) rather than one
-- plaintext column each — see src/security/crypto.js and
-- src/repositories/ledger.repository.js. Nothing here is ever UPDATEd or
-- DELETEd by the app; db/roles/grant-app-role.sql revokes both at the DB
-- level so a compromised app role can still only append.
--
-- prev_hash/row_hash chain each user's rows together (row_hash covers the
-- previous row's hash + this row's own fields, including its ciphertext) so
-- altering or deleting a historical row — even by someone with direct SQL
-- access — breaks the chain from that point forward. See
-- ledger.repository.js#verifyChain.
CREATE TABLE IF NOT EXISTS ledger_entries (
  id                UUID PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAW')),
  -- NULL for DEPOSIT/WITHDRAW (cash-only movements); gold/silver for a trade.
  metal             VARCHAR(10) CHECK (metal IN ('gold', 'silver')),
  status            VARCHAR(12) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  -- Encrypted {grams, pricePerGramBDT, feeBDT, taxBDT, cashDelta, goldDelta,
  -- silverDelta, cashBalanceAfter, goldBalanceAfter, silverBalanceAfter}.
  amounts_enc       JSONB NOT NULL,
  key_version       SMALLINT NOT NULL,
  -- Links a DEPOSIT row back to the SSLCommerz session that funded it.
  payment_tran_id   VARCHAR(50) REFERENCES payments(tran_id),
  -- Lets a buy/sell/withdraw call be safely retried: a repeat with the same
  -- key returns the original result instead of double-applying.
  idempotency_key   VARCHAR(100),
  prev_hash         CHAR(64),
  row_hash          CHAR(64) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_created ON ledger_entries (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_entries_idempotency
  ON ledger_entries (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
