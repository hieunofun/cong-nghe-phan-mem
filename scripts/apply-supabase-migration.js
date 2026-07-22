require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const migrationsDirectory = path.join(__dirname, '..', 'supabase', 'migrations');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thieu DATABASE_URL trong file .env');
  }

  const migrationFiles = fs.readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  if (!migrationFiles.length) throw new Error('Khong tim thay migration Supabase nao.');
  const ssl =
    process.env.PGSSLMODE === 'disable'
      ? false
      : process.env.DATABASE_URL.includes('supabase.co') || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl
  });

  await client.connect();
  try {
    console.log(`Dang chay ${migrationFiles.length} migration Supabase/PostgreSQL...`);
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDirectory, file), 'utf8');
      console.log(`  -> ${file}`);
      await client.query(sql);
    }
    console.log('Da cap nhat database JobLink thanh cong.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Loi khi tao database Supabase:', err.message);
  process.exit(1);
});
