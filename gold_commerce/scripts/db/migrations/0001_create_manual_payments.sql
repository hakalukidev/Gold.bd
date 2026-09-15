-- Manual (bKash/Nagad/bank) checkout payments awaiting admin review. Unlike
-- sslcommerz_payments, nothing here is ever confirmed by a gateway callback —
-- an admin approves or declines it by hand after checking the sender's
-- number/transaction ID (or bank proof image) against the real account.
CREATE TABLE manual_payments (
  id                  UUID PRIMARY KEY,
  order_id            TEXT NOT NULL UNIQUE,
  method              TEXT NOT NULL CHECK (method IN ('bkash', 'nagad', 'bank')),
  amount_bdt          NUMERIC(12, 2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'BDT',
  status              TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED')),

  customer_name       TEXT NOT NULL,
  customer_email      TEXT,
  customer_phone      TEXT NOT NULL,

  -- bKash / Nagad: the number the shopper sent from, and the TrxID they got back.
  sender_number       TEXT,
  transaction_id      TEXT,

  -- Bank transfer: the shopper's own account details, plus a proof-of-payment
  -- screenshot (see proof_image_path — stored on disk, never a public URL).
  bank_account_number TEXT,
  bank_account_name   TEXT,
  bank_name           TEXT,
  bank_branch         TEXT,
  proof_image_path    TEXT,

  -- Cart snapshot + delivery details, same idea as sslcommerz_payments.metadata.
  metadata            JSONB NOT NULL DEFAULT '{}',

  reviewed_by         TEXT,
  reviewed_at         TIMESTAMPTZ,
  decline_reason      TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX manual_payments_status_idx ON manual_payments (status);
