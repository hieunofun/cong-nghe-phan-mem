// models/packageModel.js
const pool = require('../config/db');

async function getAll() {
  const [rows] = await pool.query(
    'SELECT * FROM packages WHERE is_active = TRUE ORDER BY sort_order ASC'
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM packages WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findByCode(code) {
  const [rows] = await pool.query('SELECT * FROM packages WHERE code = ?', [code]);
  return rows[0] || null;
}

module.exports = { getAll, findById, findByCode };
