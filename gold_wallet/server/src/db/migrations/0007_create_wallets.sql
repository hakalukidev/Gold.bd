-- One row per user holding the balances GET /api/wallet reports. cash_balance_bdt
-- is credited by payment.service.js when a wallet deposit settles VALID (the
-- only real money-in path today) and debited by POST /api/wallet/withdraw.
-- gold_balance_grams/silver_balance_grams stay at 0 until a buy/sell trading
-- module exists to move them — there's no fabricated demo data here, only
-- what the ledger can actually account for.
CREATE TABLE IF NOT EXISTS wallets (
  user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cash_balance_bdt      NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cash_balance_bdt >= 0),
  gold_balance_grams    NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (gold_balance_grams >= 0),
  silver_balance_grams  NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (silver_balance_grams >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
