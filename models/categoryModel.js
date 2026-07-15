// models/categoryModel.js
const pool = require('../config/db');

async function getAll() {
  const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create({ name, slug }) {
  const [result] = await pool.query(
    'INSERT INTO categories (name, slug) VALUES (?, ?)',
    [name, slug]
  );
  return result.insertId;
}

async function remove(id) {
  await pool.query('DELETE FROM categories WHERE id = ?', [id]);
}

module.exports = { getAll, findById, create, remove };
