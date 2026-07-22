-- =========================================================
-- JOBLINK - NEN TANG TUYEN DUNG (Doanh nghiep + Ung vien + Admin)
-- Database schema (MySQL 8.0)
-- =========================================================

CREATE DATABASE IF NOT EXISTS joblink_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE joblink_db;

-- ---------------------------------------------------------
-- 1. USERS (tai khoan dang nhap chung cho ca 3 vai tro)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'company', 'candidate') NOT NULL,
  status ENUM('active', 'pending', 'banned') NOT NULL DEFAULT 'active',
  terms_accepted_at DATETIME,
  terms_version VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_reset_user (user_id),
  INDEX idx_password_reset_expiry (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 2. CATEGORIES (nganh nghe / linh vuc)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 3. COMPANIES (ho so doanh nghiep, can admin duyet)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  company_name VARCHAR(200) NOT NULL,
  tax_code VARCHAR(50),
  description TEXT,
  logo_url VARCHAR(255),
  website VARCHAR(255),
  address VARCHAR(255),
  scale VARCHAR(50),
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 4. CANDIDATES (ho so ung vien)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  address VARCHAR(255),
  birth_date DATE,
  gender ENUM('male', 'female', 'other'),
  skills TEXT,
  experience TEXT,
  education TEXT,
  cv_url VARCHAR(255),
  avatar_url VARCHAR(255),
  is_searchable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 5. JOBS (tin tuyen dung)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  category_id INT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  benefits TEXT,
  salary_min INT,
  salary_max INT,
  salary_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
  location VARCHAR(255),
  job_type ENUM('full-time', 'part-time', 'internship', 'remote') NOT NULL DEFAULT 'full-time',
  experience_level VARCHAR(100),
  vacancies INT NOT NULL DEFAULT 1,
  deadline DATE,
  status ENUM('active', 'closed', 'expired') NOT NULL DEFAULT 'active',
  is_vip BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FULLTEXT KEY ft_title_desc (title, description)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 6. APPLICATIONS (ho so ung tuyen)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  candidate_id INT NOT NULL,
  cv_url VARCHAR(255),
  cover_letter TEXT,
  status ENUM('pending', 'reviewing', 'interview', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
  status_note TEXT,
  ai_score DECIMAL(5,2),
  ai_label VARCHAR(50),
  ai_analyzed_at TIMESTAMP NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  UNIQUE KEY unique_application (job_id, candidate_id),
  INDEX idx_applications_job_status_applied (job_id, status, applied_at),
  INDEX idx_applications_job_ai_score (job_id, ai_score)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS application_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  from_status VARCHAR(30) NOT NULL,
  to_status VARCHAR(30) NOT NULL,
  note TEXT,
  changed_by_user_id INT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_application_status_history_application (application_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 7. SAVED_JOBS (ung vien luu tin de xem sau)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  job_id INT NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  UNIQUE KEY unique_save (candidate_id, job_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 8. PACKAGES (goi dich vu doanh nghiep)
-- ---------------------------------------------------------
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
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 9. PAYMENTS (giao dich thanh toan)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  package_id INT NOT NULL,
  amount INT NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  payment_method ENUM('bank_transfer', 'momo', 'demo') NOT NULL DEFAULT 'bank_transfer',
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
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 10. COMPANY_SUBSCRIPTIONS (goi dang hoat dong)
-- ---------------------------------------------------------
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
  status ENUM('active', 'expired', 'cancelled') NOT NULL DEFAULT 'active',
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- SEED DATA: nganh nghe co ban
-- ---------------------------------------------------------
INSERT INTO categories (name, slug) VALUES
  ('Công nghệ thông tin', 'cong-nghe-thong-tin'),
  ('Kinh doanh / Bán hàng', 'kinh-doanh-ban-hang'),
  ('Marketing / Truyền thông', 'marketing-truyen-thong'),
  ('Kế toán / Kiểm toán', 'ke-toan-kiem-toan'),
  ('Nhân sự / Hành chính', 'nhan-su-hanh-chinh'),
  ('Thiết kế / Sáng tạo', 'thiet-ke-sang-tao'),
  ('Chăm sóc khách hàng', 'cham-soc-khach-hang'),
  ('Logistics / Vận tải', 'logistics-van-tai')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO packages
  (name, code, price, duration_days, max_job_posts, max_vip_posts, can_search_cv, max_cv_views, description, sort_order)
VALUES
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
