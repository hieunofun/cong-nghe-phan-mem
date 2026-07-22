ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ai_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS ai_label VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_applications_job_status_applied
  ON applications(job_id, status, applied_at);

CREATE INDEX IF NOT EXISTS idx_applications_job_ai_score
  ON applications(job_id, ai_score);
