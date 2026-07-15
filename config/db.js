// config/db.js
// Tao connection pool ket noi MySQL, dung chung cho toan bo models

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'joblink_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

// Kiem tra ket noi ngay khi server khoi dong
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('Da ket noi MySQL thanh cong:', process.env.DB_NAME);
    conn.release();
  } catch (err) {
    console.error('Loi ket noi MySQL:', err.message);
    console.error('Kiem tra lai file .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) va dam bao MySQL dang chay.');
  }
}

testConnection();

module.exports = pool;
