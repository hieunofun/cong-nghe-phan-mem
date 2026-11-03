// Create/update the GitHub push webhook for a temporary, signed demo receiver.
// GitHub tokens stay in gh's credential store, never in source or state files.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, execFileSync } = require('node:child_process');
const { client } = require('./lib/jenkins-client');
const root = path.resolve(__dirname, '..');
const runtime = path.join(root, '.devops');
const configFile = path.join(runtime, 'webhook-config.json');
const stateFile = path.join(runtime, 'webhook-state.json');
const repository = 'hieunofun/cong-nghe-phan-mem';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function read(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}
function save(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}
function config() {
  let value = read(configFile);
  if (!value) {
    value = { repository, branch: 'main', port: 9010, secret: crypto.randomBytes(32).toString('hex'), instanceId: crypto.randomUUID() };
    save(configFile, value);
  }
  return value;
}
function github(endpoint, { method = 'GET', body } = {}) {
  let token;
  try {
    token = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com', '--user', repository.split('/')[0]],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }).trim();
  } catch { /* Use the active gh account if the repository owner is not stored. */ }
  const args = ['api', '--method', method, '-H', 'Accept: application/vnd.github+json', endpoint];
  if (body !== undefined) args.push('--input', '-');
  const output = execFileSync('gh', args, { cwd: root, encoding: 'utf8',
    input: body === undefined ? undefined : JSON.stringify(body),
    env: token ? { ...process.env, GH_TOKEN: token } : process.env,
    stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  return output.trim() ? JSON.parse(output) : null;
}
function startProcess(binary, args, logFile) {
  const fd = fs.openSync(logFile, 'a');
  const child = spawn(binary, args, { cwd: root, detached: true, windowsHide: true, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd);
  child.on('error', error => console.error(`Cannot start ${binary}: ${error.message}`));
  child.unref();
  return child.pid;
}
function stopOwned(pid, expected) {
  if (!Number.isInteger(pid) || pid <= 0) return;
  try {
    const command = process.platform === 'win32'
      ? execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`],
        { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
      : fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8');
    if (expected.every(part => command.toLowerCase().includes(part.toLowerCase()))) process.kill(pid);
  } catch { /* Already stopped, or stale PID belonging to something else. */ }
}
async function healthy(url, instanceId) {
  try {
    const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(8000) });
    const data = await response.json();
    return response.ok && data.instanceId === instanceId;
  } catch { return false; }
}
async function waitFor(label, fn, timeout = 120000) {
  const until = Date.now() + timeout;
  do {
    const result = await fn();
    if (result) return result;
    await sleep(2000);
  } while (Date.now() < until);
  throw new Error(`Timed out: ${label}`);
}

async function start() {
  const cfg = config();
  const old = read(stateFile, {});
  if (old.url && await healthy(old.url, cfg.instanceId)) {
    console.log(`Webhook active: ${old.url}/github-webhook/`);
    return;
  }
  const jenkins = client();
  await jenkins.request('/job/joblink-scm/api/json');
  const repo = github(`repos/${repository}`);
  if (!repo.permissions?.admin) throw new Error('GitHub repository admin/webhook-write permission is required.');
  stopOwned(old.tunnelPid, ['cloudflared', `127.0.0.1:${cfg.port}`]);
  stopOwned(old.receiverPid, [path.join(root, 'scripts/github-webhook.js')]);
  const state = { ...old, repository, startedAt: new Date().toISOString() };
  if (!await healthy(`http://127.0.0.1:${cfg.port}`, cfg.instanceId)) {
    state.receiverPid = startProcess(process.execPath, [path.join(root, 'scripts/github-webhook.js')], path.join(runtime, 'webhook-receiver.log'));
    save(stateFile, state);
  }
  await waitFor('webhook receiver', () => healthy(`http://127.0.0.1:${cfg.port}`, cfg.instanceId), 30000);
  const log = path.join(runtime, 'cloudflared.log');
  fs.writeFileSync(log, '');
  state.tunnelPid = startProcess(process.env.CLOUDFLARED_BIN || 'cloudflared',
    ['tunnel', '--no-autoupdate', '--protocol', 'http2', '--url', `http://127.0.0.1:${cfg.port}`], log);
  save(stateFile, state);
  console.log('Starting HTTPS tunnel to the signed receiver; Jenkins UI stays on localhost.');
  state.url = await waitFor('Cloudflare Quick Tunnel URL', async () =>
    fs.readFileSync(log, 'utf8').match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0]);
  save(stateFile, state);
  await waitFor('public webhook receiver', () => healthy(state.url, cfg.instanceId));
  const hooks = github(`repos/${repository}/hooks`);
  const existing = hooks.find(hook => hook.id === old.hookId);
  const body = { active: true, events: ['push'], config: {
    url: `${state.url}/github-webhook/`, content_type: 'json', insecure_ssl: '0', secret: cfg.secret
  } };
  const hook = existing
    ? github(`repos/${repository}/hooks/${existing.id}`, { method: 'PATCH', body })
    : github(`repos/${repository}/hooks`, { method: 'POST', body: { name: 'web', ...body } });
  state.hookId = hook.id;
  state.active = true;
  save(stateFile, state);
  console.log(`Webhook configured on ${repository}: ${state.url}/github-webhook/`);
  console.log('Push main -> signed webhook -> joblink-scm -> tests/build/deploy/smoke checks.');
}

async function main() {
  const action = process.argv[2] || 'status';
  if (action === 'start') return start();
  const state = read(stateFile, {});
  if (action === 'stop') {
    if (state.hookId) {
      github(`repos/${repository}/hooks/${state.hookId}`, { method: 'PATCH', body: { active: false } });
    }
    stopOwned(state.tunnelPid, ['cloudflared', '127.0.0.1:9010']);
    stopOwned(state.receiverPid, [path.join(root, 'scripts/github-webhook.js')]);
    save(stateFile, { ...state, active: false });
    console.log('GitHub hook disabled; managed tunnel and receiver stopped.');
  } else if (action === 'status') {
    const cfg = read(configFile);
    const up = cfg && state.url && await healthy(state.url, cfg.instanceId);
    console.log(up ? `Webhook ready: ${state.url}/github-webhook/` : 'Webhook is not ready. Run node scripts/webhook-demo.js start.');
    if (state.hookId) console.log(`GitHub hook ID: ${state.hookId}; Jenkins job: joblink-scm`);
  } else {
    console.log('Usage: node scripts/webhook-demo.js start|status|stop');
  }
}

if (require.main === module) main().catch(error => {
  console.error(`FAIL webhook: ${error.message}`);
  process.exitCode = 1;
});
module.exports = { github };
