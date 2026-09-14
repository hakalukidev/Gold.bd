-- Tracks a "print my photo on the physical coin" add-on request for a gift
-- (see modules/gift) — this app has no minting/shipping automation, so an
-- admin fulfills these by hand once they've printed and shipped the coin
-- (see modules/gift/gift-coin.routes.js's admin endpoints). One row per gift
-- that opted in; the photo itself lives on disk (see gift-coin.storage.js),
-- never served publicly — only through an authenticated admin-only route.
CREATE TABLE IF NOT EXISTS gift_coin_orders (
  id                UUID PRIMARY KEY,
  ledger_entry_id   UUID NOT NULL REFERENCES ledger_entries(id),
  sender_id         UUID NOT NULL REFERENCES users(id),
  recipient_id      UUID NOT NULL REFERENCES users(id),
  photo_path        TEXT NOT NULL,
  occasion          VARCHAR(20),
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FULFILLED')),
  fulfilled_by      UUID REFERENCES users(id),
  fulfilled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_coin_orders_status ON gift_coin_orders (status, created_at);
