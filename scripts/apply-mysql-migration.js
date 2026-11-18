// Idempotent MySQL schema migration runner for Docker / Production upgrades.
// Safely evolves existing MySQL volumes without dropping data or recreating tables.
require('dotenv').config();
const mysql = require('mysql2/promise');

const MIGRATIONS = [
  {
    version: '20261118_01_oauth_users',
    description: 'Allow nullable password and OAuth columns on users',
    async up(conn, helpers) {
      if (await helpers.columnIsNotNull('users', 'password')) {
        await conn.query('ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL');
      }
      await helpers.ensureColumn('users', 'oauth_provider', "VARCHAR(20) NULL COMMENT 'google | github | facebook'");
      await helpers.ensureColumn('users', 'oauth_id', 'VARCHAR(100) NULL');
      await helpers.ensureColumn('users', 'display_name', 'VARCHAR(150) NULL');
      await helpers.ensureColumn('users', 'social_avatar', 'VARCHAR(255) NULL');
      await helpers.ensureColumn('users', 'terms_accepted_at', 'DATETIME NULL');
      await helpers.ensureColumn('users', 'terms_version', 'VARCHAR(20) NULL');
      await helpers.ensureIndex('users', 'uq_oauth', 'UNIQUE KEY uq_oauth (oauth_provider, oauth_id)');
    }
  },
  {
    version: '20261118_02_candidate_and_application_lifecycle',
    description: 'Ensure candidate auto-apply and application lifecycle columns/tables exist',
    async up(conn, helpers) {
      await helpers.ensureColumn('candidates', 'cv_filename', 'VARCHAR(255) NULL');
      await helpers.ensureColumn('candidates', 'auto_apply_enabled', 'BOOLEAN NOT NULL DEFAULT FALSE');
      await helpers.ensureColumn('candidates', 'auto_apply_min_score', 'DECIMAL(5,2) NOT NULL DEFAULT 70.00');
      await helpers.ensureColumn('candidates', 'is_searchable', 'BOOLEAN NOT NULL DEFAULT TRUE');

      await helpers.ensureColumn('jobs', 'is_vip', 'BOOLEAN NOT NULL DEFAULT FALSE');
      await helpers.ensureColumn('jobs', 'is_featured', 'BOOLEAN NOT NULL DEFAULT FALSE');

      await helpers.ensureColumn('applications', 'cv_filename', 'VARCHAR(255) NULL');
      await helpers.ensureColumn('applications', 'cv_source', "VARCHAR(20) NOT NULL DEFAULT 'profile'");
      await helpers.ensureColumn('applications', 'application_source', "VARCHAR(20) NOT NULL DEFAULT 'manual'");
      await helpers.ensureColumn('applications', 'ai_score', 'DECIMAL(5,2) NULL');
      await helpers.ensureColumn('applications', 'ai_label', 'VARCHAR(50) NULL');
      await helpers.ensureColumn('applications', 'ai_analyzed_at', 'TIMESTAMP NULL');

      await conn.query(`
        CREATE TABLE IF NOT EXISTS application_status_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          application_id INT NOT NULL,
          from_status VARCHAR(30),
          to_status VARCHAR(30) NOT NULL,
          note TEXT,
          changed_by_user_id INT,
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
          FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_application_status_history_application (application_id)
        ) ENGINE=InnoDB
      `);
    }
  }
];

function createHelpers(conn, dbName) {
  return {
    async columnExists(table, column) {
      const [rows] = await conn.query(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
        [dbName, table, column]
      );
      return rows.length > 0;
    },
    async columnIsNotNull(table, column) {
      const [rows] = await conn.query(
        `SELECT IS_NULLABLE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
        [dbName, table, column]
      );
      return rows[0]?.IS_NULLABLE === 'NO';
    },
    async ensureColumn(table, column, definition) {
      if (!(await this.columnExists(table, column))) {
        await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      }
    },
    async ensureIndex(table, indexName, indexClause) {
      const [rows] = await conn.query(
        `SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [dbName, table, indexName]
      );
      if (rows.length === 0) {
        await conn.query(`ALTER TABLE \`${table}\` ADD ${indexClause}`);
      }
    }
  };
}

async function runMysqlMigrations(connectionOptions) {
  const dbClient = (process.env.DB_CLIENT || (process.env.DATABASE_URL ? 'postgres' : 'mysql')).toLowerCase();
  if (dbClient !== 'mysql' && !connectionOptions) {
    console.log('[MySQL Migrate] DB_CLIENT không phải mysql — bỏ qua.');
    return { skipped: true, applied: [] };
  }

  const dbName = connectionOptions?.database || process.env.DB_NAME || 'joblink_db';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'joblink_user',
    password: process.env.DB_PASSWORD || 'joblink_password',
    database: dbName,
    charset: 'utf8mb4',
    ...connectionOptions
  });

  const applied = [];
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    const helpers = createHelpers(conn, dbName);
    for (const migration of MIGRATIONS) {
      const [existing] = await conn.query(
        'SELECT version FROM schema_migrations WHERE version = ? LIMIT 1',
        [migration.version]
      );
      await migration.up(conn, helpers);
      if (existing.length === 0) {
        await conn.query(
          'INSERT INTO schema_migrations (version, description) VALUES (?, ?)',
          [migration.version, migration.description]
        );
        applied.push(migration.version);
        console.log(`[MySQL Migrate] Applied ${migration.version}: ${migration.description}`);
      }
    }
    if (applied.length === 0) {
      console.log('[MySQL Migrate] Schema MySQL đã ở trạng thái mới nhất.');
    }
    return { skipped: false, applied };
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  runMysqlMigrations().catch((err) => {
    console.error('[MySQL Migrate] Lỗi khi chạy migration:', err.message);
    process.exitCode = 1;
  });
}

module.exports = { MIGRATIONS, runMysqlMigrations };
