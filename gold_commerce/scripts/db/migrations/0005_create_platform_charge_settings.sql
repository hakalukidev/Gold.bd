-- Admin-configured percentages added on top of the base gram price (real
-- BAJUS rate x weight premium) to arrive at what a shopper actually pays.
-- Fixed key set, one row per charge — mirrors payment_method_settings' shape.
CREATE TABLE platform_charge_settings (
  key         TEXT PRIMARY KEY CHECK (key IN ('platform_charge', 'vat')),
  percent     NUMERIC(6, 3) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_charge_settings (key, percent) VALUES
  ('platform_charge', 0),
  ('vat', 0);
