-- Admin-configured receiving-account details shown to shoppers in the
-- bKash/Nagad/bank-transfer checkout modals. One row per method; `details`
-- shape depends on `method`:
--   bkash/nagad -> {"receiverNumber": "01XXXXXXXXX"}
--   bank        -> {"bankName", "accountName", "accountNumber", "branch"}
CREATE TABLE payment_method_settings (
  method      TEXT PRIMARY KEY CHECK (method IN ('bkash', 'nagad', 'bank')),
  details     JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO payment_method_settings (method, details) VALUES
  ('bkash', '{}'),
  ('nagad', '{}'),
  ('bank', '{}');
