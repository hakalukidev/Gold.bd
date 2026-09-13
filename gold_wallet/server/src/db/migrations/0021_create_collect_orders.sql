-- Adds COLLECT alongside the existing ledger types — a physical bar/coin
-- withdrawal debits the wallet's gold/silver the same way a sale or gift
-- does (see modules/collect/collect.service.js), just with no cash or
-- counterparty on the other side.
ALTER TABLE ledger_entries DROP CONSTRAINT ledger_entries_type_check;
ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_type_check
  CHECK (type IN ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAW', 'GIFT_SENT', 'GIFT_RECEIVED', 'COLLECT'));

-- Tracks a physical delivery/pickup request for metal already debited from
-- the wallet at request time (see collect.service.js#request) — this app has
-- no courier integration, so an admin verifies and approves each one by
-- hand once the shipment/pickup is actually arranged. address_enc is only
-- populated for method='home' (a pickup-point collection needs no address),
-- encrypted the same way payments.customer_enc is.
CREATE TABLE IF NOT EXISTS collect_orders (
  id                UUID PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES users(id),
  ledger_entry_id   UUID NOT NULL REFERENCES ledger_entries(id),
  weight_grams      NUMERIC(10, 4) NOT NULL,
  metal             VARCHAR(10) NOT NULL CHECK (metal IN ('gold', 'silver')),
  form              VARCHAR(10) NOT NULL CHECK (form IN ('bar', 'coin')),
  method            VARCHAR(10) NOT NULL CHECK (method IN ('home', 'pickup')),
  delivery_fee_bdt  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- Encrypted {fullName, phone, district, postalCode, streetAddress}, method='home' only.
  address_enc       JSONB,
  key_version       SMALLINT,
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED')),
  approved_by       UUID REFERENCES users(id),
  approved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collect_orders_status ON collect_orders (status, created_at);
