require('dotenv').config();

const { removeConnectionStringSslOptions } = require('../utils/postgresConnection');

const dbClient = (process.env.DB_CLIENT || (process.env.DATABASE_URL ? 'postgres' : 'mysql')).toLowerCase();

function toPostgresSql(sql) {
  let text = sql;

  text = text.replace(
    /INSERT\s+IGNORE\s+INTO\s+saved_jobs\s+\(([^)]+)\)\s+VALUES\s+\(([^)]+)\)/i,
    (_match, columns, values) =>
      `INSERT INTO saved_jobs (${columns}) VALUES (${values}) ON CONFLICT (candidate_id, job_id) DO NOTHING`
  );

  text = text
    .replace(/DATE_ADD\(NOW\(\),\s*INTERVAL\s*\?\s*DAY\)/gi, "(NOW() + (? * INTERVAL '1 day'))")
    .replace(/DATE_SUB\(NOW\(\),\s*INTERVAL\s*6\s*MONTH\)/gi, "(NOW() - INTERVAL '6 months')")
    .replace(/DATE_FORMAT\(paid_at,\s*'%Y-%m'\)/gi, "TO_CHAR(paid_at, 'YYYY-MM')")
    .replace(
      /MONTH\(paid_at\)\s*=\s*MONTH\(NOW\(\)\)\s*AND\s*YEAR\(paid_at\)\s*=\s*YEAR\(NOW\(\)\)/gi,
      "DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())"
    );

  if (/^\s*INSERT\b/i.test(text) && !/\bRETURNING\b/i.test(text) && !/\bDO NOTHING\b/i.test(text)) {
    text = `${text} RETURNING id`;
  }

  let index = 0;
  text = text.replace(/\?/g, () => `$${++index}`);
  return text;
}

function createPostgresPool() {
  const { Pool } = require('pg');
  const connectionString = removeConnectionStringSslOptions(process.env.DATABASE_URL);
  const ssl =
    process.env.PGSSLMODE === 'disable'
      ? false
      : (process.env.DATABASE_URL || '').includes('supabase.co') || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined;

  const pgPool = new Pool(
    connectionString
      ? { connectionString, ssl }
      : {
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'postgres',
          port: Number(process.env.DB_PORT || 5432),
          ssl
        }
  );

  return {
    isPostgres: true,
    async query(sql, params = []) {
      const text = toPostgresSql(sql);
      const result = await pgPool.query(text, params);

      if (/^\s*SELECT\b/i.test(text) || /^\s*WITH\b/i.test(text)) {
        return [result.rows, result.fields];
      }

      return [
        {
          insertId: result.rows?.[0]?.id || null,
          affectedRows: result.rowCount,
          rowCount: result.rowCount
        },
        result.fields
      ];
    },
    execute(sql, params = []) {
      return this.query(sql, params);
    },
    async getConnection() {
      const client = await pgPool.connect();
      return {
        release: () => client.release(),
        query: (sql, params = []) => client.query(toPostgresSql(sql), params),
        beginTransaction: () => client.query('BEGIN'),
        commit: () => client.query('COMMIT'),
        rollback: () => client.query('ROLLBACK')
      };
    }
  };
}

function createMysqlPool() {
  const mysql = require('mysql2/promise');
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'joblink_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
  });
}

const pool = dbClient === 'postgres' || dbClient === 'postgresql' || dbClient === 'supabase'
  ? createPostgresPool()
  : createMysqlPool();

// Kiem tra ket noi ngay khi server khoi dong
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log(`Da ket noi ${pool.isPostgres ? 'PostgreSQL/Supabase' : 'MySQL'} thanh cong.`);
    conn.release();
  } catch (err) {
    console.error(`Loi ket noi ${pool.isPostgres ? 'PostgreSQL/Supabase' : 'MySQL'}:`, err.message);
    console.error('Kiem tra lai file .env (DATABASE_URL hoac DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).');
  }
}

testConnection();

module.exports = pool;
