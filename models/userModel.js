// models/userModel.js
const pool = require('../config/db');

async function createUser({ email, hashedPassword, role, status = 'active' }) {
  const [result] = await pool.query(
    'INSERT INTO users (email, password, role, status) VALUES (?, ?, ?, ?)',
    [email, hashedPassword, role, status]
  );
  return result.insertId;
}

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, email, role, status, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function getAllUsers() {
  const [rows] = await pool.query(
    'SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC'
  );
  return rows;
}

async function updateStatus(id, status) {
  await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
}

async function updatePassword(id, hashedPassword) {
  await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  getAllUsers,
  updateStatus,
  updatePassword
};
