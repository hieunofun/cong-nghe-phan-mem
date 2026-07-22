// models/savedJobModel.js
const pool = require('../config/db');

async function saveJob(candidateId, jobId) {
  await pool.query(
    'INSERT IGNORE INTO saved_jobs (candidate_id, job_id) VALUES (?, ?)',
    [candidateId, jobId]
  );
}

async function unsaveJob(candidateId, jobId) {
  await pool.query(
    'DELETE FROM saved_jobs WHERE candidate_id = ? AND job_id = ?',
    [candidateId, jobId]
  );
}

async function findByCandidate(candidateId) {
  const [rows] = await pool.query(
    `SELECT s.id AS saved_id, s.saved_at, j.*, c.company_name, c.logo_url
     FROM saved_jobs s
     JOIN jobs j ON j.id = s.job_id
     JOIN companies c ON c.id = j.company_id
     WHERE s.candidate_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM applications a
         WHERE a.candidate_id = s.candidate_id AND a.job_id = s.job_id
       )
     ORDER BY s.saved_at DESC`,
    [candidateId]
  );
  return rows;
}

module.exports = { saveJob, unsaveJob, findByCandidate };
