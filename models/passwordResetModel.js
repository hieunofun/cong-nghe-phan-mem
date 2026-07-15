const pool = require('../config/db');

async function replaceToken({ userId, tokenHash, expiresAt }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);
    await connection.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function consumeTokenAndUpdatePassword(tokenHash, hashedPassword) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );

    const resetToken = rows[0];
    if (!resetToken) {
      await connection.rollback();
      return false;
    }

    await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resetToken.user_id]);
    await connection.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [resetToken.id]);
    await connection.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [resetToken.user_id]
    );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { replaceToken, consumeTokenAndUpdatePassword };
