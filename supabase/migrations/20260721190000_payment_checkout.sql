-- JOBLINK - checkout chuyen khoan that, VietQR va bang chung chap thuan dieu khoan

ALTER TABLE payments
  ALTER COLUMN payment_method SET DEFAULT 'bank_transfer',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20),
  ADD COLUMN IF NOT EXISTS privacy_version VARCHAR(20),
  ADD COLUMN IF NOT EXISTS accepted_ip VARCHAR(64),
  ADD COLUMN IF NOT EXISTS accepted_user_agent VARCHAR(500);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_transaction_code
  ON payments(transaction_code);
