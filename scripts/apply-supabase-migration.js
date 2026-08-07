require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const { removeConnectionStringSslOptions } = require('../utils/postgresConnection');

const migrationsDirectory = path.join(__dirname, '..', 'supabase', 'migrations');
const IF_CONFIGURED = process.argv.includes('--if-configured');
const BEST_EFFORT = process.argv.includes('--best-effort');

function checksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    if (IF_CONFIGURED) {
      console.log('Bo qua migration Supabase: DATABASE_URL chua duoc cau hinh.');
      return;
    }
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
    connectionString: removeConnectionStringSslOptions(process.env.DATABASE_URL),
    ssl
  });

  await client.connect();
  try {
    const failures = [];
    await client.query(`
      CREATE TABLE IF NOT EXISTS joblink_schema_migrations (
        filename TEXT PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log(`Dang kiem tra ${migrationFiles.length} migration Supabase/PostgreSQL...`);
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDirectory, file), 'utf8');
      const fileChecksum = checksum(sql);
      const existing = await client.query(
        'SELECT checksum FROM joblink_schema_migrations WHERE filename = $1',
        [file]
      );
      if (existing.rows.length) {
        if (existing.rows[0].checksum !== fileChecksum) {
          throw new Error(`Migration ${file} da bi thay doi sau khi ap dung.`);
        }
        console.log(`  -> ${file} (da ap dung)`);
        continue;
      }

      console.log(`  -> ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO joblink_schema_migrations (filename, checksum) VALUES ($1, $2)',
          [file, fileChecksum]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        if (!BEST_EFFORT) throw error;
        failures.push(`${file}: ${error.message}`);
        console.error(`     Khong ap dung duoc ${file}: ${error.message}`);
      }
    }
    if (failures.length) {
      console.warn(`Database con ${failures.length} migration chua ap dung; web van tiep tuc khoi dong.`);
    } else {
      console.log('Database JobLink da dung schema hien tai.');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Loi khi tao database Supabase:', err.message);
  if (!BEST_EFFORT) process.exitCode = 1;
});
