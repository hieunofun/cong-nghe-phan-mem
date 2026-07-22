-- =========================================================
-- JOBLINK - MONETIZATION MIGRATION (MySQL 8.0 compatible)
-- Chay file nay trong phpMyAdmin > tab SQL
-- =========================================================

USE joblink_db;

-- 1. Goi dich vu
CREATE TABLE IF NOT EXISTS packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  price INT NOT NULL DEFAULT 0,
  duration_days INT NOT NULL DEFAULT 30,
  max_job_posts INT NOT NULL DEFAULT 3,
  max_vip_posts INT NOT NULL DEFAULT 0,
  can_search_cv BOOLEAN NOT NULL DEFAULT FALSE,
  max_cv_views INT NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Giao dich thanh toan
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  package_id INT NOT NULL,
  amount INT NOT NULL,
  status ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  payment_method ENUM('bank_transfer','momo','demo') NOT NULL DEFAULT 'bank_transfer',
  transaction_code VARCHAR(100) UNIQUE,
  expires_at DATETIME NULL,
  terms_accepted_at DATETIME NULL,
  terms_version VARCHAR(20) NULL,
  privacy_version VARCHAR(20) NULL,
  accepted_ip VARCHAR(64) NULL,
  accepted_user_agent VARCHAR(500) NULL,
  note TEXT,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id)
);

-- 3. Dang ky goi cua doanh nghiep
CREATE TABLE IF NOT EXISTS company_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  package_id INT NOT NULL,
  payment_id INT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  job_posts_used INT NOT NULL DEFAULT 0,
  vip_posts_used INT NOT NULL DEFAULT 0,
  cv_views_used INT NOT NULL DEFAULT 0,
  status ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);

-- 4. Them cot VIP vao jobs (an toan khi chay lai migration)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. Cho phep ung vien opt-in kho CV
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS is_searchable BOOLEAN NOT NULL DEFAULT TRUE;

-- 6. Seed goi dich vu
INSERT INTO packages (name, code, price, duration_days, max_job_posts, max_vip_posts, can_search_cv, max_cv_views, description, sort_order) VALUES
  ('Miễn phí', 'free', 0, 30, 3, 0, FALSE, 0, 'Đăng tối đa 3 tin/tháng, không có tin VIP.', 0),
  ('Basic', 'basic', 1500000, 30, 10, 2, TRUE, 10, '10 tin/tháng, 2 tin VIP và 10 lượt xem CV ứng viên.', 1),
  ('Pro', 'pro', 3500000, 30, 30, 10, TRUE, 50, '30 tin/tháng, 10 tin VIP, tìm kiếm 50 CV ứng viên.', 2),
  ('Enterprise', 'enterprise', 8000000, 30, 999, 999, TRUE, 999, 'Không giới hạn tin đăng, tin VIP và xem CV ứng viên.', 3)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  price = VALUES(price),
  duration_days = VALUES(duration_days),
  max_job_posts = VALUES(max_job_posts),
  max_vip_posts = VALUES(max_vip_posts),
  can_search_cv = VALUES(can_search_cv),
  max_cv_views = VALUES(max_cv_views),
  description = VALUES(description),
  sort_order = VALUES(sort_order);
