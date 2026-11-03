// scripts/docker-start.js
// Khởi chạy ứng dụng trong Docker container:
// 1. Chờ kết nối MySQL sẵn sàng
// 2. Tự động chạy seed dữ liệu mẫu nếu DB chưa có admin
// 3. Khởi động server JobLink

require('dotenv').config();
const { execSync } = require('child_process');
const pool = require('../config/db');

async function waitForDb(maxRetries = 30, delayMs = 2000) {
  console.log('🔄 [Docker Entry] Đang kiểm tra kết nối Database MySQL...');
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const conn = await pool.getConnection();
      console.log('✅ [Docker Entry] Kết nối MySQL thành công!');
      conn.release();
      return true;
    } catch (err) {
      console.log(`⏳ [Docker Entry] [Lần ${i}/${maxRetries}] Chờ MySQL khởi động (${err.message})...`);
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  throw new Error('❌ Không thể kết nối tới MySQL sau nhiều lần thử.');
}

async function autoSeedIfEmpty() {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE email = 'admin@joblink.vn' LIMIT 1"
  );
  if (!rows || rows.length === 0) {
    console.log('🌱 [Docker Entry] Chưa có dữ liệu mẫu. Bắt đầu chạy npm run seed...');
    execSync('npm run seed', { stdio: 'inherit' });
    console.log('✅ [Docker Entry] Đã hoàn tất seed dữ liệu mẫu.');
  } else {
    console.log('ℹ️ [Docker Entry] Dữ liệu mẫu đã có sẵn trong cơ sở dữ liệu.');
  }
}

async function main() {
  try {
    await waitForDb();
    await autoSeedIfEmpty();
    console.log('🚀 [Docker Entry] Đang khởi động JobLink server...');
    const app = require('../server.js');
    const port = Number(process.env.PORT || 3000);
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`[Docker Entry] JobLink đang chạy trên cổng ${port}.`);
    });
    server.on('error', (err) => {
      console.error('[Docker Entry] Không thể mở cổng web:', err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('❌ Lỗi khởi động:', err);
    process.exit(1);
  }
}

main();
