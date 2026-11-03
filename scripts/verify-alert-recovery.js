// Integration check: briefly stop AI, observe a real alert, then always restart AI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const result = { startedAt: new Date().toISOString() };

function compose(action) {
  execFileSync('docker', ['compose', '-f', 'docker-compose.yml', action, 'ai'], { cwd: root, stdio: 'inherit' });
}

async function query(expr) {
  const response = await fetch(`http://127.0.0.1:9090/api/v1/query?query=${encodeURIComponent(expr)}`,
    { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200);
  return (await response.json()).data.result;
}

async function until(label, condition, timeout = 100000) {
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
  let failure;
  try {
    compose('stop');
    result.probeDownAt = await until('AI probe changes to DOWN', async () => {
      const rows = await query('probe_success{job="joblink-probes",service="ai"}');
      return rows.length === 1 && Number(rows[0].value[1]) === 0;
    });
    result.alertFiringAt = await until('JobLinkServiceDown fires for AI', async () => {
      const rows = await query('ALERTS{alertname="JobLinkServiceDown",service="ai",alertstate="firing"}');
      return rows.length === 1;
    });
  } catch (error) {
    failure = error;
  } finally {
    compose('start');
    result.recoveredAt = await until('AI probe returns UP', async () => {
      const rows = await query('probe_success{job="joblink-probes",service="ai"}');
      return rows.length === 1 && Number(rows[0].value[1]) === 1;
    });
    result.alertResolvedAt = await until('AI alert resolves after recovery', async () => {
      const rows = await query('ALERTS{alertname="JobLinkServiceDown",service="ai",alertstate="firing"}');
      return rows.length === 0;
    });
  }
  if (failure) throw failure;
  result.status = 'PASS';
  const output = path.join(root, 'artifacts', 'midterm-demo');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'alert-recovery.json'), `${JSON.stringify(result, null, 2)}\n`);
}

main().catch(error => {
  console.error(`FAIL alert recovery: ${error.message}`);
  process.exitCode = 1;
});
