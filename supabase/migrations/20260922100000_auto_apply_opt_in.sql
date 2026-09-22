-- Candidate-controlled automatic application for newly published jobs.
-- It is disabled by default and never changes existing applications.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS auto_apply_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_apply_min_score NUMERIC(5,2) NOT NULL DEFAULT 70.00;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS application_source VARCHAR(20) NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_candidates_auto_apply_enabled
  ON candidates(auto_apply_enabled)
  WHERE auto_apply_enabled = TRUE;

UPDATE applications
SET application_source = 'manual'
WHERE application_source IS NULL OR TRIM(application_source) = '';

