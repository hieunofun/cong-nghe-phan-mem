// models/applicationModel.js
const pool = require('../config/db');

async function create({ jobId, candidateId, cvUrl, coverLetter }) {
  const [result] = await pool.query(
    `INSERT INTO applications (job_id, candidate_id, cv_url, cover_letter, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [jobId, candidateId, cvUrl || null, coverLetter || null]
  );
  return result.insertId;
}

async function hasApplied(jobId, candidateId) {
  const [rows] = await pool.query(
    'SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?',
    [jobId, candidateId]
  );
  return rows.length > 0;
}

// Danh sach ung vien ung tuyen vao 1 tin (cho doanh nghiep xem & quan ly pipeline)
async function findByJob(jobId) {
  const [rows] = await pool.query(
    `SELECT a.*, cd.full_name, cd.phone, cd.skills, cd.experience, cd.avatar_url, u.email
     FROM applications a
     JOIN candidates cd ON cd.id = a.candidate_id
     JOIN users u ON u.id = cd.user_id
     WHERE a.job_id = ?
     ORDER BY a.applied_at DESC`,
    [jobId]
  );
  return rows;
}

// Danh sach tin ung vien da ung tuyen (cho candidate dashboard)
async function findByCandidate(candidateId) {
  const [rows] = await pool.query(
    `SELECT a.*, j.title AS job_title, j.location, j.job_type, c.company_name, c.logo_url
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN companies c ON c.id = j.company_id
     WHERE a.candidate_id = ?
     ORDER BY a.applied_at DESC`,
    [candidateId]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT a.*, j.company_id, j.title AS job_title
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function updateStatus(id, status) {
  await pool.query('UPDATE applications SET status = ? WHERE id = ?', [status, id]);
}

// Thong ke nhanh cho company dashboard: so luong theo trang thai
async function countByCompanyAndStatus(companyId) {
  const [rows] = await pool.query(
    `SELECT a.status, COUNT(*) AS count
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE j.company_id = ?
     GROUP BY a.status`,
    [companyId]
  );
  return rows;
}

module.exports = {
  create, hasApplied, findByJob, findByCandidate, findById,
  updateStatus, countByCompanyAndStatus
};
