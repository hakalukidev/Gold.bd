-- Adds GIFT_SENT/GIFT_RECEIVED alongside the existing BUY/SELL/DEPOSIT/
-- WITHDRAW ledger types (see modules/gift). A gift is a straight metal
-- transfer between two wallets: the sender's row is GIFT_SENT (negative
-- gold/silverDelta), the recipient's is GIFT_RECEIVED (positive) — two rows,
-- one per user, same as every other ledger entry being scoped to a single
-- user_id. VARCHAR(10) was one character too short for "GIFT_RECEIVED".
ALTER TABLE ledger_entries ALTER COLUMN type TYPE VARCHAR(20);
ALTER TABLE ledger_entries DROP CONSTRAINT ledger_entries_type_check;
ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_type_check
  CHECK (type IN ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAW', 'GIFT_SENT', 'GIFT_RECEIVED'));
