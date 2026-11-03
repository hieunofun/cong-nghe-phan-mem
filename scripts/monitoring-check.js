// Verify actual Prometheus series/rules and the provisioned Grafana dashboard.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const prometheus = process.env.PROMETHEUS_URL || 'http://127.0.0.1:9090';
const grafana = process.env.GRAFANA_URL || 'http://127.0.0.1:3001';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function json(base, endpoint, headers = {}) {
  const response = await fetch(`${base}${endpoint}`, { headers, signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, `${endpoint}: HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const deadline = Date.now() + 60000;
  let probes;
  while (Date.now() < deadline) {
    const data = await json(prometheus, `/api/v1/query?query=${encodeURIComponent('probe_success{job="joblink-probes"}')}`);
    probes = data.data.result;
    if (probes.length === 4 && probes.every(item => Number(item.value[1]) === 1)) break;
    await sleep(3000);
  }
  assert.equal(probes.length, 4, 'Expected Web, AI, MySQL TCP and database API probes');
  for (const probe of probes) {
    assert.equal(Number(probe.value[1]), 1, `${probe.metric.service} probe is down`);
    console.log(`PASS probe ${probe.metric.service}: UP`);
  }
  const targets = await json(prometheus, '/api/v1/targets');
  assert.equal(targets.data.activeTargets.length, 6);
  assert.ok(targets.data.activeTargets.every(item => item.health === 'up'));
  console.log('PASS Prometheus: 6/6 scrape targets UP');
  const rules = await json(prometheus, '/api/v1/rules');
  const alerts = rules.data.groups.flatMap(group => group.rules);
  for (const name of ['JobLinkServiceDown', 'JobLinkProbeMissing', 'JobLinkSlowResponse']) {
    assert.ok(alerts.some(rule => rule.name === name && rule.health === 'ok'), name);
  }
  console.log('PASS Prometheus: 3 alert rules loaded');
  assert.equal((await json(grafana, '/api/health')).database, 'ok');
  console.log('PASS Grafana health and configuration database');
  const password = process.env.GRAFANA_ADMIN_PASSWORD || fs.readFileSync(
    path.resolve(__dirname, '../.devops/credentials.env'), 'utf8'
  ).match(/^GRAFANA_ADMIN_PASSWORD=(.+)$/m)?.[1].trim();
  assert.ok(password, 'Grafana admin password is required');
  const headers = { Authorization: `Basic ${Buffer.from(`admin:${password}`).toString('base64')}` };
  const dashboard = await json(grafana, '/api/dashboards/uid/joblink-overview', headers);
  assert.ok(dashboard.dashboard.panels.length >= 6);
  const expected = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, '../devops/grafana/dashboards/joblink-overview.json'), 'utf8'
  ));
  assert.equal(dashboard.dashboard.title, expected.title, 'Grafana has an outdated dashboard title');
  for (const panel of expected.panels) {
    const actual = dashboard.dashboard.panels.find(item => item.id === panel.id);
    assert.equal(actual?.title, panel.title, `Dashboard panel ${panel.id} is outdated`);
    assert.equal(actual?.type, panel.type, `Dashboard panel ${panel.id} has the wrong visualization`);
  }
  const datasource = await json(grafana, '/api/datasources/uid/joblink-prometheus/health', headers);
  assert.equal(datasource.status, 'OK');
  console.log('PASS Grafana: dashboard provisioned and Prometheus datasource connected');
  console.log('8/8 monitoring checks passed.');
}

main().catch(error => {
  console.error(`FAIL monitoring: ${error.message}`);
  process.exitCode = 1;
});
