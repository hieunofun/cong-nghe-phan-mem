ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ai_score DECIMAL(5,2) NULL AFTER status_note,
  ADD COLUMN IF NOT EXISTS ai_label VARCHAR(50) NULL AFTER ai_score,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP NULL AFTER ai_label;

CREATE INDEX idx_applications_job_status_applied
  ON applications(job_id, status, applied_at);

CREATE INDEX idx_applications_job_ai_score
  ON applications(job_id, ai_score);
