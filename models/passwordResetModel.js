const pool = require('../config/db');

async function invalidateForUser(userId) {
  await pool.query(
    'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
    [userId]
  );
}

async function create({ userId, tokenHash, expiresAt }) {
  const [result] = await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt]
  );
  return result.insertId;
}

async function findValidByHash(tokenHash) {
  const [rows] = await pool.query(
    `SELECT id, user_id, expires_at
     FROM password_reset_tokens
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function consume(id) {
  const [result] = await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE id = ? AND used_at IS NULL AND expires_at > NOW()`,
    [id]
  );
  return Number(result.affectedRows || result.rowCount || 0) === 1;
}

module.exports = { invalidateForUser, create, findValidByHash, consume };
