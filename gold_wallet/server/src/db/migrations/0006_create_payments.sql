-- SSLCommerz-backed payment sessions — one row per gateway transaction,
-- shared by gold_commerce (order checkout) and gold_wallet/client (wallet
-- top-up) via this server's payments module. `source_app` + `purpose` say
-- which flow created a row so one table (and one gateway integration) serves
-- both instead of duplicating the SSLCommerz plumbing per app.
CREATE TABLE IF NOT EXISTS payments (
  id                UUID PRIMARY KEY,
  tran_id           VARCHAR(50) NOT NULL UNIQUE,
  source_app        VARCHAR(10) NOT NULL CHECK (source_app IN ('commerce', 'wallet')),
  purpose           VARCHAR(20) NOT NULL CHECK (purpose IN ('order', 'deposit')),
  -- Set for wallet deposits (the caller is signed in); NULL for gold_commerce
  -- orders, which this repo still supports as guest checkout.
  user_id           UUID REFERENCES users(id),
  amount_bdt        NUMERIC(12, 2) NOT NULL CHECK (amount_bdt > 0),
  currency          VARCHAR(6) NOT NULL DEFAULT 'BDT',
  status            VARCHAR(12) NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'VALID', 'FAILED', 'CANCELLED')),
  customer_name     VARCHAR(100) NOT NULL,
  customer_email    VARCHAR(255) NOT NULL,
  customer_phone    VARCHAR(20) NOT NULL,
  -- Frontend origin+path (e.g. https://shop.example/checkout) this row's
  -- caller asked to be sent back to once SSLCommerz resolves the payment.
  -- Validated against CORS_ORIGINS at init time so the redirect can't be
  -- steered off-site.
  return_base_url   TEXT NOT NULL,
  -- Free-form context from the initiating app — e.g. a cart snapshot for a
  -- commerce order. Never trusted for pricing; amount_bdt above is what's
  -- actually charged.
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  val_id            VARCHAR(100),
  card_type         VARCHAR(50),
  bank_tran_id      VARCHAR(50),
  -- Last IPN/validator payload SSLCommerz sent for this transaction, kept for
  -- support/debugging.
  gateway_response  JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);
