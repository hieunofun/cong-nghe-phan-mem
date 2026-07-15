// models/candidateModel.js
const pool = require('../config/db');

async function createCandidate({ userId, fullName }) {
  const [result] = await pool.query(
    'INSERT INTO candidates (user_id, full_name) VALUES (?, ?)',
    [userId, fullName]
  );
  return result.insertId;
}

async function findByUserId(userId) {
  const [rows] = await pool.query('SELECT * FROM candidates WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT cd.*, u.email FROM candidates cd
     JOIN users u ON u.id = cd.user_id
     WHERE cd.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function updateProfile(id, fields) {
  const allowed = [
    'full_name', 'phone', 'address', 'birth_date', 'gender',
    'skills', 'experience', 'education', 'cv_url', 'avatar_url'
  ];
  const sets = [];
  const values = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }
  if (sets.length === 0) return;
  values.push(id);
  await pool.query(`UPDATE candidates SET ${sets.join(', ')} WHERE id = ?`, values);
}

async function getAll() {
  const [rows] = await pool.query(
    `SELECT cd.*, u.email, u.status AS account_status FROM candidates cd
     JOIN users u ON u.id = cd.user_id
     ORDER BY cd.created_at DESC`
  );
  return rows;
}

module.exports = { createCandidate, findByUserId, findById, updateProfile, getAll };
