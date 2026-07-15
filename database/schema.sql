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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  UNIQUE KEY unique_application (job_id, candidate_id)
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
-- SEED DATA: nganh nghe co ban
-- ---------------------------------------------------------
INSERT INTO categories (name, slug) VALUES
  ('Cong nghe thong tin', 'cong-nghe-thong-tin'),
  ('Kinh doanh / Ban hang', 'kinh-doanh-ban-hang'),
  ('Marketing / Truyen thong', 'marketing-truyen-thong'),
  ('Ke toan / Kiem toan', 'ke-toan-kiem-toan'),
  ('Nhan su / Hanh chinh', 'nhan-su-hanh-chinh'),
  ('Thiet ke / Sang tao', 'thiet-ke-sang-tao'),
  ('Cham soc khach hang', 'cham-soc-khach-hang'),
  ('Logistics / Van tai', 'logistics-van-tai')
ON DUPLICATE KEY UPDATE name = VALUES(name);
