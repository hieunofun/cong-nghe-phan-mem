require('dotenv').config();

const bcrypt = require('bcryptjs');
const pool = require('../config/db');

function validatePassword(password) {
  return typeof password === 'string'
    && password.length >= 12
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

async function main() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL khong hop le.');
  }
  if (!validatePassword(password)) {
    throw new Error('ADMIN_PASSWORD phai co it nhat 12 ky tu, gom chu hoa, chu thuong, so va ky tu dac biet.');
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (rows[0]) {
    await pool.query(
      "UPDATE users SET password = ?, role = 'admin', status = 'active' WHERE id = ?",
      [hashedPassword, rows[0].id]
    );
  } else {
    await pool.query(
      "INSERT INTO users (email, password, role, status) VALUES (?, ?, 'admin', 'active')",
      [email, hashedPassword]
    );
  }
  console.log(`Tai khoan admin production da san sang: ${email}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Khong tao duoc admin:', err.message);
  process.exit(1);
});
