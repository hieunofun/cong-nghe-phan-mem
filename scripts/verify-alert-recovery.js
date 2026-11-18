// Integration drill: stop AI, observe Prometheus alert + Alertmanager webhook delivery, then always recover AI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const result = { startedAt: new Date().toISOString() };

function compose(action) {
  execFileSync('docker', ['compose', '-f', 'docker-compose.yml', action, 'ai'], { cwd: root, stdio: 'inherit' });
}

async function query(expr) {
  const response = await fetch(
    `http://127.0.0.1:9090/api/v1/query?query=${encodeURIComponent(expr)}`,
    { signal: AbortSignal.timeout(10000) }
  );
  assert.equal(response.status, 200);
  return (await response.json()).data.result;
}

async function alertLedger() {
  const response = await fetch('http://127.0.0.1:3000/internal/alert-webhook', {
    signal: AbortSignal.timeout(10000)
  });
  assert.equal(response.status, 200);
  return response.json();
}

async function until(label, condition, timeout = 120000) {
  const deadline = Date.now() + timeout;
  do {
    if (await condition()) {
      console.log(`PASS ${label}`);
      return new Date().toISOString();
    }
    await sleep(3000);
  } while (Date.now() < deadline);
  throw new Error(`Timed out: ${label}`);
}

async function main() {
  const initialLedger = await alertLedger();
  const baseFiring = initialLedger.counts?.firing || 0;
  const baseResolved = initialLedger.counts?.resolved || 0;

  let failure;
  try {
    compose('stop');
    result.probeDownAt = await until('AI probe changes to DOWN', async () => {
      const rows = await query('probe_success{job="joblink-probes",service="ai"}');
      return rows.length === 1 && Number(rows[0].value[1]) === 0;
    });
    result.alertFiringAt = await until('JobLinkServiceDown fires in Prometheus', async () => {
      const rows = await query('ALERTS{alertname="JobLinkServiceDown",service="ai",alertstate="firing"}');
      return rows.length === 1;
    });
    result.webhookFiringDeliveredAt = await until('Alertmanager delivers [FIRING] webhook notification', async () => {
      const ledger = await alertLedger();
      return (ledger.counts?.firing || 0) > baseFiring;
    });
  } catch (error) {
    failure = error;
  } finally {
    compose('start');
    result.recoveredAt = await until('AI probe returns UP', async () => {
      const rows = await query('probe_success{job="joblink-probes",service="ai"}');
      return rows.length === 1 && Number(rows[0].value[1]) === 1;
    });
    result.alertResolvedAt = await until('AI alert resolves in Prometheus', async () => {
      const rows = await query('ALERTS{alertname="JobLinkServiceDown",service="ai",alertstate="firing"}');
      return rows.length === 0;
    });
    result.webhookResolvedDeliveredAt = await until('Alertmanager delivers [RESOLVED] webhook notification', async () => {
      const ledger = await alertLedger();
      return (ledger.counts?.resolved || 0) > baseResolved;
    });
  }
  if (failure) throw failure;
  result.status = 'PASS';
  for (const folder of ['final-demo', 'midterm-demo']) {
    const output = path.join(root, 'artifacts', folder);
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'alert-recovery.json'), `${JSON.stringify(result, null, 2)}\n`);
  }
}

main().catch((error) => {
  console.error(`FAIL alert recovery: ${error.message}`);
  process.exitCode = 1;
});
