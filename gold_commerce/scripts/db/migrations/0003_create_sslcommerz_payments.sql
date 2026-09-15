-- This app's own SSLCommerz session records — independent of gold_wallet's
-- `payments` table (no shared DB, no runtime dependency on wallet_server).
-- Trimmed down from gold_wallet's version since gold_commerce only ever runs
-- guest "order" checkouts (no source_app/purpose/user_id needed).
CREATE TABLE sslcommerz_payments (
  tran_id           TEXT PRIMARY KEY,
  order_id          TEXT NOT NULL,
  amount_bdt        NUMERIC(12, 2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'BDT',
  status            TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VALID', 'FAILED', 'CANCELLED')),

  customer_name     TEXT NOT NULL,
  customer_email    TEXT,
  customer_phone    TEXT,
  customer_address  TEXT,

  return_base_url   TEXT NOT NULL,
  metadata          JSONB NOT NULL DEFAULT '{}',

  val_id            TEXT,
  card_type         TEXT,
  bank_tran_id      TEXT,
  gateway_response  JSONB,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
