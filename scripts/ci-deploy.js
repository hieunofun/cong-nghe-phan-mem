// Deploy only Web/AI. Never recreate MySQL, remove volumes, or change schema.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const stateFile = path.resolve('.ci/deployment.json');

function docker(args, capture = false, env = process.env) {
  return execFileSync('docker', args, {
    encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', env
  });
}

function image(container) {
  return docker(['inspect', '--format', '{{.Config.Image}}', container], true).trim();
}

function up(images) {
  docker(['compose', '-f', 'docker-compose.yml', 'up', '-d', '--no-build', '--no-deps',
    '--wait', '--wait-timeout', '180', 'ai', 'web'], false,
  { ...process.env, COMPOSE_IGNORE_ORPHANS: 'true', ...images });
}

function save(state) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
}

function main() {
  const action = process.argv[2];
  if (action === 'deploy') {
    const mysql = docker(['inspect', '--format', '{{.State.Health.Status}}', 'joblink-mysql'], true).trim();
    if (mysql !== 'healthy') throw new Error('MySQL must be healthy. Start the demo stack before deploying.');
    if (!process.env.JOBLINK_WEB_IMAGE || !process.env.JOBLINK_AI_IMAGE) {
      throw new Error('Both JOBLINK_WEB_IMAGE and JOBLINK_AI_IMAGE are required.');
    }
    const state = {
      startedAt: new Date().toISOString(),
      previous: { JOBLINK_WEB_IMAGE: image('joblink-web'), JOBLINK_AI_IMAGE: image('joblink-ai') },
      next: { JOBLINK_WEB_IMAGE: process.env.JOBLINK_WEB_IMAGE, JOBLINK_AI_IMAGE: process.env.JOBLINK_AI_IMAGE },
      status: 'deploying'
    };
    save(state); // Save before touching containers, including partially failed deployments.
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
    console.log('Restoring previous Web/AI images. MySQL and volumes are preserved.');
    up(state.previous);
    state.status = 'rolled-back';
    state.rolledBackAt = new Date().toISOString();
    save(state);
  } else {
    throw new Error('Usage: node scripts/ci-deploy.js deploy|confirm|rollback');
  }
}

try { main(); } catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
