// Day-2 Operations: MySQL logical backup & disaster recovery for the Docker stack.
// Keeps database credentials out of process command-line arguments via MYSQL_PWD.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const backupDir = path.join(root, '.devops', 'backups');
const container = process.env.MYSQL_CONTAINER || 'joblink-mysql';
const dbName = process.env.DB_NAME || 'joblink_db';
const dbUser = process.env.DB_USER || 'joblink_user';
const dbPassword = process.env.DB_PASSWORD || 'joblink_password';
const keepCount = Math.max(1, Number(process.env.BACKUP_KEEP || 5));

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function pruneOldBackups(dir = backupDir, keep = keepCount) {
  if (!fs.existsSync(dir)) return [];
  const sqlFiles = fs.readdirSync(dir)
    .filter((name) => name.startsWith('joblink-') && name.endsWith('.sql'))
    .sort()
    .reverse();
  const removed = [];
  for (const stale of sqlFiles.slice(keep)) {
    const base = path.join(dir, stale);
    fs.rmSync(base, { force: true });
    fs.rmSync(`${base}.json`, { force: true });
    removed.push(stale);
  }
  return removed;
}

function createBackup() {
  fs.mkdirSync(backupDir, { recursive: true });
  const filename = `joblink-${timestampSlug()}.sql`;
  const sqlPath = path.join(backupDir, filename);

  const dump = execFileSync(
    'docker',
    [
      'exec',
      '-e', `MYSQL_PWD=${dbPassword}`,
      container,
      'mysqldump',
      '--single-transaction',
      '--routines',
      '--triggers',
      '--default-character-set=utf8mb4',
      '-u', dbUser,
      dbName
    ],
    { maxBuffer: 64 * 1024 * 1024 }
  );

  if (!dump || dump.length < 100) {
    throw new Error('Bản sao lưu MySQL trống hoặc không hợp lệ.');
  }

  fs.writeFileSync(sqlPath, dump, { mode: 0o600 });
  const metadata = {
    filename,
    database: dbName,
    container,
    createdAt: new Date().toISOString(),
    sizeBytes: dump.length,
    sha256: sha256(dump)
  };
  fs.writeFileSync(`${sqlPath}.json`, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 });
  const pruned = pruneOldBackups(backupDir, keepCount);
  console.log(`PASS DB backup created: ${sqlPath} (${dump.length} bytes, sha256=${metadata.sha256.slice(0, 12)}...)`);
  if (pruned.length > 0) {
    console.log(`Pruned ${pruned.length} older backup(s): ${pruned.join(', ')}`);
  }
  return metadata;
}

function listBackups(dir = backupDir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.startsWith('joblink-') && name.endsWith('.sql.json'))
    .sort()
    .reverse()
    .map((metaFile) => JSON.parse(fs.readFileSync(path.join(dir, metaFile), 'utf8')));
}

function restoreBackup(targetFile) {
  const backups = listBackups();
  const chosen = targetFile
    ? path.resolve(targetFile)
    : (backups[0] ? path.join(backupDir, backups[0].filename) : '');
  if (!chosen || !fs.existsSync(chosen)) {
    throw new Error('Không tìm thấy file backup để phục hồi. Chạy npm run db:backup trước.');
  }

  const sqlBuffer = fs.readFileSync(chosen);
  const metaPath = `${chosen}.json`;
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const actualHash = sha256(sqlBuffer);
    if (meta.sha256 && meta.sha256 !== actualHash) {
      throw new Error(`Checksum SHA-256 không khớp cho file ${path.basename(chosen)}. Hủy phục hồi.`);
    }
  }

  execFileSync(
    'docker',
    [
      'exec', '-i',
      '-e', `MYSQL_PWD=${dbPassword}`,
      container,
      'mysql',
      '--default-character-set=utf8mb4',
      '-u', dbUser,
      dbName
    ],
    { input: sqlBuffer, stdio: ['pipe', 'inherit', 'inherit'] }
  );
  console.log(`PASS DB restored successfully from ${chosen}`);
}

function main() {
  const action = process.argv[2] || 'list';
  if (action === 'backup') {
    createBackup();
  } else if (action === 'restore') {
    restoreBackup(process.argv[3]);
  } else if (action === 'list') {
    const items = listBackups();
    if (items.length === 0) {
      console.log('No backups found in .devops/backups/.');
      return;
    }
    for (const item of items) {
      console.log(`${item.createdAt} | ${item.filename} | ${item.sizeBytes} bytes | sha256:${item.sha256.slice(0, 12)}`);
    }
  } else {
    throw new Error('Usage: node scripts/db-backup.js backup|restore [file]|list');
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`FAIL db-backup: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { createBackup, listBackups, pruneOldBackups, sha256, timestampSlug };
