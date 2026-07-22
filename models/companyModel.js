// models/companyModel.js
const pool = require('../config/db');

async function createCompany({ userId, companyName, taxCode, address }) {
  const [result] = await pool.query(
    `INSERT INTO companies (user_id, company_name, tax_code, address, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [userId, companyName, taxCode || null, address || null]
  );
  return result.insertId;
}

async function findByUserId(userId) {
  const [rows] = await pool.query('SELECT * FROM companies WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT c.*, u.email FROM companies c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function updateProfile(id, fields) {
  const allowed = ['company_name', 'description', 'logo_url', 'website', 'address', 'scale', 'tax_code'];
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
  await pool.query(`UPDATE companies SET ${sets.join(', ')} WHERE id = ?`, values);
}

async function getAll({ status } = {}) {
  let sql = `SELECT c.*, u.email FROM companies c JOIN users u ON u.id = c.user_id`;
  const params = [];
  if (status) {
    sql += ' WHERE c.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY c.created_at DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function updateStatus(id, status) {
  await pool.query('UPDATE companies SET status = ? WHERE id = ?', [status, id]);
}

module.exports = {
  createCompany,
  findByUserId,
  findById,
  updateProfile,
  getAll,
  updateStatus
};
