-- =========================================================
-- JOBLINK - OAUTH MIGRATION
-- Chay trong phpMyAdmin > tab SQL truoc khi dung tinh nang dang nhap mang xa hoi
-- =========================================================

USE joblink_db;

-- Cho phep password NULL (nguoi dung OAuth khong co password)
ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL;

-- Them cac cot OAuth
ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20) NULL COMMENT 'google | github | facebook';
ALTER TABLE users ADD COLUMN oauth_id VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN display_name VARCHAR(150) NULL;
ALTER TABLE users ADD COLUMN social_avatar VARCHAR(255) NULL;

-- Index de tim kiem nhanh theo oauth_provider + oauth_id
ALTER TABLE users ADD UNIQUE KEY uq_oauth (oauth_provider, oauth_id);
