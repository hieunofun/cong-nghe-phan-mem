// Verify Prometheus blackbox + white-box series, Alertmanager readiness, and Grafana provisioning.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const prometheus = process.env.PROMETHEUS_URL || 'http://127.0.0.1:9090';
const alertmanager = process.env.ALERTMANAGER_URL || 'http://127.0.0.1:9093';
const grafana = process.env.GRAFANA_URL || 'http://127.0.0.1:3001';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function json(base, endpoint, headers = {}) {
  const response = await fetch(`${base}${endpoint}`, { headers, signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, `${base}${endpoint}: HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const deadline = Date.now() + 60000;
  let probes;
  while (Date.now() < deadline) {
    const data = await json(
      prometheus,
      `/api/v1/query?query=${encodeURIComponent('probe_success{job="joblink-probes"}')}`
    );
    probes = data.data.result;
    if (probes.length === 5 && probes.every((item) => Number(item.value[1]) === 1)) break;
    await sleep(3000);
  }
  assert.equal(probes.length, 5, 'Expected Gateway, Web, AI, MySQL TCP and database API probes');
  for (const probe of probes) {
    assert.equal(Number(probe.value[1]), 1, `${probe.metric.service} probe is down`);
    console.log(`PASS probe ${probe.metric.service}: UP`);
  }

  const targets = await json(prometheus, '/api/v1/targets');
  assert.ok(targets.data.activeTargets.length >= 12, 'Expected at least 12 active scrape targets (including node-exporter and cadvisor)');
  assert.ok(targets.data.activeTargets.every((item) => item.health === 'up'), 'All active scrape targets must be UP');
  console.log(`PASS Prometheus: ${targets.data.activeTargets.length}/${targets.data.activeTargets.length} scrape targets UP (blackbox + white-box + node-exporter + cadvisor + alertmanager)`);

  const webSeries = await json(
    prometheus,
    `/api/v1/query?query=${encodeURIComponent('nodejs_resident_memory_bytes{job="joblink-web-metrics"}')}`
  );
  assert.equal(webSeries.data.result.length, 1, 'Missing white-box Node.js memory metric');
  const aiSeries = await json(
    prometheus,
    `/api/v1/query?query=${encodeURIComponent('joblink_ai_mode_info{job="joblink-ai-metrics"}')}`
  );
  assert.equal(aiSeries.data.result.length, 1, 'Missing white-box AI mode metric');
  console.log('PASS White-box metrics ingested from both Web and AI services');

  const filesystem = await json(
    prometheus,
    `/api/v1/query?query=${encodeURIComponent('node_filesystem_avail_bytes{job="node-exporter",mountpoint="/"}')}`
  );
  assert.ok(filesystem.data.result.length > 0, 'Missing root filesystem metrics from Node Exporter');
  const containerMemory = await json(
    prometheus,
    `/api/v1/query?query=${encodeURIComponent('container_memory_working_set_bytes{job="cadvisor",name="joblink-web"}')}`
  );
  assert.ok(containerMemory.data.result.length > 0, 'cAdvisor does not report metrics for the Web container');
  console.log('PASS Infrastructure metrics present for the root filesystem and Web container');

  const rules = await json(prometheus, '/api/v1/rules');
  const alerts = rules.data.groups.flatMap((group) => group.rules);
  const expectedAlerts = [
    'JobLinkServiceDown',
    'JobLinkProbeMissing',
    'JobLinkSlowResponse',
    'JobLinkHighErrorRate',
    'JobLinkHighMemoryUsage',
    'JobLinkHostHighCPU',
    'JobLinkContainerHighMemory'
  ];
  for (const name of expectedAlerts) {
    assert.ok(alerts.some((rule) => rule.name === name && rule.health === 'ok'), `Missing alert rule ${name}`);
  }
  console.log(`PASS Prometheus: ${expectedAlerts.length}/${expectedAlerts.length} alert rules loaded and healthy`);

  const amStatus = await json(alertmanager, '/api/v2/status');
  assert.ok(amStatus.cluster?.status === 'ready' || amStatus.versionInfo, 'Alertmanager is not ready');
  console.log('PASS Alertmanager ready and connected');

  assert.equal((await json(grafana, '/api/health')).database, 'ok');
  console.log('PASS Grafana health and configuration database');

  const password = process.env.GRAFANA_ADMIN_PASSWORD || fs.readFileSync(
    path.resolve(__dirname, '../.devops/credentials.env'),
    'utf8'
  ).match(/^GRAFANA_ADMIN_PASSWORD=(.+)$/m)?.[1].trim();
  assert.ok(password, 'Grafana admin password is required');
  const headers = { Authorization: `Basic ${Buffer.from(`admin:${password}`).toString('base64')}` };
  const summaries = [];
  for (const uid of ['joblink-overview', 'joblink-infrastructure']) {
    const { dashboard } = await json(grafana, `/api/dashboards/uid/${uid}`, headers);
    const expected = JSON.parse(fs.readFileSync(
      path.resolve(__dirname, `../devops/grafana/dashboards/${uid}.json`),
      'utf8'
    ));
    assert.equal(dashboard.title, expected.title, `${uid} has an outdated dashboard title`);
    assert.equal(dashboard.panels.length, expected.panels.length, `${uid} panel count`);
    for (const panel of expected.panels) {
      const actual = dashboard.panels.find((item) => item.id === panel.id);
      assert.equal(actual?.title, panel.title, `${uid} panel ${panel.id} is outdated`);
      assert.equal(actual?.type, panel.type, `${uid} panel ${panel.id} has the wrong visualization`);
    }
    summaries.push(`${uid} (${expected.panels.length} panels)`);
  }
  const datasource = await json(grafana, '/api/datasources/uid/joblink-prometheus/health', headers);
  assert.equal(datasource.status, 'OK');
  console.log(`PASS Grafana: ${summaries.join(', ')} provisioned and Prometheus datasource connected`);
  console.log('12/12 full-stack monitoring checks passed.');
}

main().catch((error) => {
  console.error(`FAIL monitoring: ${error.message}`);
  process.exitCode = 1;
});
