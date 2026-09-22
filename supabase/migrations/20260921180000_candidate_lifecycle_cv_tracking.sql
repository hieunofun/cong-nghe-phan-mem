-- Keep the CV submitted with each application traceable and expose the full
-- application lifecycle, including the initial submission event.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS cv_filename VARCHAR(255);

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS cv_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cv_source VARCHAR(20) NOT NULL DEFAULT 'profile';

ALTER TABLE application_status_history
  ALTER COLUMN from_status DROP NOT NULL;

UPDATE candidates
SET cv_filename = 'CV đã tải lên'
WHERE cv_url IS NOT NULL AND cv_filename IS NULL;

UPDATE applications
SET cv_filename = 'CV đã nộp'
WHERE cv_url IS NOT NULL AND cv_filename IS NULL;

INSERT INTO application_status_history
  (application_id, from_status, to_status, note, changed_by_user_id, changed_at)
SELECT
  a.id,
  NULL::application_status,
  'pending'::application_status,
  'Ứng viên gửi hồ sơ ứng tuyển',
  c.user_id,
  a.applied_at
FROM applications a
JOIN candidates c ON c.id = a.candidate_id
WHERE NOT EXISTS (
  SELECT 1
  FROM application_status_history h
  WHERE h.application_id = a.id
    AND h.from_status IS NULL
);

