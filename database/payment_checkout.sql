-- JOBLINK - checkout chuyen khoan that, VietQR va bang chung chap thuan dieu khoan
-- MySQL 8.0

USE joblink_db;

ALTER TABLE payments
  MODIFY COLUMN payment_method ENUM('bank_transfer', 'momo', 'demo') NOT NULL DEFAULT 'bank_transfer',
  ADD COLUMN IF NOT EXISTS expires_at DATETIME NULL AFTER transaction_code,
  ADD COLUMN IF NOT EXISTS terms_accepted_at DATETIME NULL AFTER expires_at,
  ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) NULL AFTER terms_accepted_at,
  ADD COLUMN IF NOT EXISTS privacy_version VARCHAR(20) NULL AFTER terms_version,
  ADD COLUMN IF NOT EXISTS accepted_ip VARCHAR(64) NULL AFTER privacy_version,
  ADD COLUMN IF NOT EXISTS accepted_user_agent VARCHAR(500) NULL AFTER accepted_ip;

CREATE UNIQUE INDEX uq_payments_transaction_code ON payments(transaction_code);
