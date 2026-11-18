// Deploy Web, AI, and Nginx Gateway atomically.
// MySQL container and named volumes are preserved; schema evolves safely via idempotent migration on Web startup.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const stateFile = path.resolve('.ci/deployment.json');

function docker(args, capture = false, env = process.env) {
  return execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env
  });
}

function tryImage(container, fallback) {
  try {
    return docker(['inspect', '--format', '{{.Config.Image}}', container], true).trim() || fallback;
  } catch {
    return fallback;
  }
}

function ensureUploadsPermissions() {
  docker(
    ['compose', '-f', 'docker-compose.yml', 'run', '--rm', '--no-deps', 'uploads-perms'],
    false,
    { ...process.env, COMPOSE_IGNORE_ORPHANS: 'true' }
  );
}

function up(images) {
  ensureUploadsPermissions();
  docker(
    [
      'compose', '-f', 'docker-compose.yml', 'up', '-d', '--no-build', '--no-deps',
      '--wait', '--wait-timeout', '180', 'ai', 'web', 'gateway'
    ],
    false,
    { ...process.env, COMPOSE_IGNORE_ORPHANS: 'true', ...images }
  );
}

function save(state) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
}

function main() {
  const action = process.argv[2];
  if (action === 'deploy') {
    const mysql = docker(['inspect', '--format', '{{.State.Health.Status}}', 'joblink-mysql'], true).trim();
    if (mysql !== 'healthy') {
      throw new Error('MySQL must be healthy. Start the stack before deploying.');
    }
    if (!process.env.JOBLINK_WEB_IMAGE || !process.env.JOBLINK_AI_IMAGE) {
      throw new Error('Both JOBLINK_WEB_IMAGE and JOBLINK_AI_IMAGE are required.');
    }
    const nextGateway = process.env.JOBLINK_GATEWAY_IMAGE || 'joblink-gateway:1.0';
    const state = {
      startedAt: new Date().toISOString(),
      previous: {
        JOBLINK_WEB_IMAGE: tryImage('joblink-web', 'joblink-web:1.0'),
        JOBLINK_AI_IMAGE: tryImage('joblink-ai', 'joblink-ai:1.0'),
        JOBLINK_GATEWAY_IMAGE: tryImage('joblink-gateway', 'joblink-gateway:1.0')
      },
      next: {
        JOBLINK_WEB_IMAGE: process.env.JOBLINK_WEB_IMAGE,
        JOBLINK_AI_IMAGE: process.env.JOBLINK_AI_IMAGE,
        JOBLINK_GATEWAY_IMAGE: nextGateway
      },
      status: 'deploying'
    };
    save(state);
    up(state.next);
    state.status = 'awaiting-smoke-checks';
    save(state);
  } else if (action === 'confirm') {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    state.status = 'verified';
    state.verifiedAt = new Date().toISOString();
    save(state);
  } else if (action === 'rollback') {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (state.status === 'verified' || state.status === 'rolled-back') return;
    console.log('Restoring previous Web/AI/Gateway images. MySQL and volumes are preserved.');
    up(state.previous);
    state.status = 'rolled-back';
    state.rolledBackAt = new Date().toISOString();
    save(state);
  } else {
    throw new Error('Usage: node scripts/ci-deploy.js deploy|confirm|rollback');
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
