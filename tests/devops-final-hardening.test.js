const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

test('Dockerfiles enforce non-root users, NODE_ENV=production, Gunicorn WSGI, and healthchecks', () => {
  const webDocker = read('Dockerfile');
  const aiDocker = read('Dockerfile.ai');
  const gwDocker = read('devops/nginx/Dockerfile');

  assert.match(webDocker, /NODE_ENV=production/);
  assert.match(webDocker, /STORAGE_DRIVER=local/);
  assert.match(webDocker, /^USER node$/m);
  assert.match(webDocker, /^HEALTHCHECK /m);

  assert.match(aiDocker, /useradd --system/);
  assert.match(aiDocker, /^USER appuser$/m);
  assert.match(aiDocker, /^HEALTHCHECK /m);
  assert.match(aiDocker, /CMD \["gunicorn"/);

  assert.match(gwDocker, /FROM nginx:1\.27-alpine/);
  assert.match(gwDocker, /gateway-health/);
});

test('Docker Compose stacks configure log rotation, shared AI token, Nginx gateway, and Alertmanager', () => {
  const appCompose = read('docker-compose.yml');
  const devopsCompose = read('docker-compose.devops.yml');

  assert.match(appCompose, /max-size:\s*"10m"/);
  assert.match(appCompose, /max-file:\s*"3"/);
  assert.match(appCompose, /NODE_ENV:\s*production/);
  assert.match(appCompose, /AI_SERVICE_TOKEN:/);
  assert.match(appCompose, /uploads-perms:/);
  assert.match(appCompose, /gateway:/);

  assert.match(devopsCompose, /alertmanager:/);
  assert.match(devopsCompose, /prom\/alertmanager:/);
  assert.match(devopsCompose, /max-size:\s*"10m"/);
});

test('Nginx reverse proxy rate-limits auth endpoints and blocks internal metrics/webhooks externally', () => {
  const nginx = read('devops/nginx/default.conf');
  assert.match(nginx, /limit_req_zone[\s\S]*joblink_auth_limit/);
  assert.match(nginx, /location = \/metrics\s*\{\s*return 403/);
  assert.match(nginx, /location \^~ \/internal\/\s*\{\s*return 403/);
  assert.match(nginx, /location = \/gateway-health/);
  assert.match(nginx, /X-Content-Type-Options "nosniff"/);
});

test('Prometheus, Alertmanager, and Grafana configurations cover white-box and blackbox observability', () => {
  const prom = read('devops/monitoring/prometheus.yml');
  const alerts = read('devops/monitoring/alerts.yml');
  const alertTests = read('devops/monitoring/alerts.test.yml');
  const alertmanager = read('devops/monitoring/alertmanager.yml');
  const dashboard = JSON.parse(read('devops/grafana/dashboards/joblink-overview.json'));

  assert.match(prom, /targets:\s*\['alertmanager:9093'\]/);
  assert.match(prom, /job_name:\s*joblink-web-metrics/);
  assert.match(prom, /job_name:\s*joblink-ai-metrics/);
  assert.match(prom, /service:\s*gateway/);

  for (const rule of [
    'JobLinkServiceDown',
    'JobLinkProbeMissing',
    'JobLinkSlowResponse',
    'JobLinkHighErrorRate',
    'JobLinkHighMemoryUsage'
  ]) {
    assert.match(alerts, new RegExp(`alert:\\s*${rule}`));
  }
  assert.match(alertTests, /JobLinkHighMemoryUsage/);
  assert.match(alertmanager, /http:\/\/web:3000\/internal\/alert-webhook/);
  assert.match(alertmanager, /send_resolved:\s*true/);
  assert.equal(dashboard.panels.length, 13);
});

test('Jenkinsfile and GitHub Actions enforce 8-stage pipeline, security audit, and rollback', () => {
  const jenkins = read('Jenkinsfile');
  const ghActions = read('.github/workflows/ci.yml');

  for (const stage of [
    'Source',
    'Node tests',
    'Security & config audit',
    'Build images',
    'AI & container checks',
    'Registry publish',
    'DB migrate & deploy',
    'Smoke checks'
  ]) {
    assert.match(jenkins, new RegExp(`stage\\('${stage}'\\)`));
  }
  assert.match(jenkins, /node scripts\/ci-deploy\.js rollback/);

  assert.match(ghActions, /npm audit --audit-level=high/);
  assert.match(ghActions, /ai_service\.test_multilingual_matching/);
  assert.match(ghActions, /promtool/);
});

test('MySQL schema unifies OAuth columns and Day-2 migration/backup helpers work cleanly', async () => {
  const schema = read('database/schema.sql');
  assert.match(schema, /oauth_provider\s+VARCHAR\(20\)/);
  assert.match(schema, /UNIQUE KEY uq_oauth \(oauth_provider, oauth_id\)/);
  assert.equal(exists('h origin main'), false, 'Stray file "h origin main" must not exist');

  const { MIGRATIONS } = require('../scripts/apply-mysql-migration');
  assert.ok(MIGRATIONS.length >= 2);

  const { pruneOldBackups, sha256 } = require('../scripts/db-backup');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'joblink-backup-test-'));
  try {
    for (const i of ['01', '02', '03']) {
      const sqlFile = path.join(tmpDir, `joblink-2026-11-18T00-00-${i}Z.sql`);
      fs.writeFileSync(sqlFile, '-- sql dump');
      fs.writeFileSync(`${sqlFile}.json`, '{}');
    }
    const removed = pruneOldBackups(tmpDir, 2);
    assert.equal(removed.length, 1);
    assert.equal(sha256(Buffer.from('joblink')).length, 64);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Express app exposes security headers, /metrics exposition, and Alertmanager webhook sink', async (t) => {
  const app = require('../server');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => {
    server.closeAllConnections?.();
    server.close(resolve);
  }));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const healthRes = await fetch(`${baseUrl}/health`);
  assert.equal(healthRes.status, 200);
  assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(healthRes.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(healthRes.headers.get('x-powered-by'), null);
  const healthJson = await healthRes.json();
  assert.equal(healthJson.status, 'ok');

  const alertPost = await fetch(`${baseUrl}/internal/alert-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      alerts: [
        {
          status: 'firing',
          labels: { alertname: 'JobLinkServiceDown', service: 'ai', severity: 'critical' },
          annotations: { summary: 'JobLink ai is unavailable' }
        },
        {
          status: 'resolved',
          labels: { alertname: 'JobLinkServiceDown', service: 'ai', severity: 'critical' },
          annotations: { summary: 'JobLink ai recovered' }
        }
      ]
    })
  });
  assert.equal(alertPost.status, 202);

  const ledger = await (await fetch(`${baseUrl}/internal/alert-webhook`)).json();
  assert.ok(ledger.counts.firing >= 1);
  assert.ok(ledger.counts.resolved >= 1);

  const metricsRes = await fetch(`${baseUrl}/metrics`);
  assert.equal(metricsRes.status, 200);
  const metricsBody = await metricsRes.text();
  assert.match(metricsBody, /joblink_http_requests_total/);
  assert.match(metricsBody, /nodejs_resident_memory_bytes/);
  assert.match(metricsBody, /joblink_alert_notifications_total\{status="firing"\}\s+[1-9]/);
  assert.match(metricsBody, /joblink_alert_notifications_total\{status="resolved"\}\s+[1-9]/);
});
