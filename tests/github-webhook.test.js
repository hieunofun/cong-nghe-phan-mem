const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createReceiver } = require('../scripts/github-webhook');

const secret = 'test-only-webhook-secret';
const payload = { repository: { full_name: 'hieunofun/cong-nghe-phan-mem' },
  ref: 'refs/heads/main', after: 'a'.repeat(40), deleted: false };

async function fixture(t, enqueue) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'joblink-webhook-test-'));
  const calls = [];
  const server = createReceiver({ secret, ledgerFile: path.join(dir, 'deliveries.json'), log() {},
    enqueue: enqueue || (async args => { calls.push(args); return '/queue/item/1/'; }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    for (const name of ['deliveries.json', 'deliveries.json.tmp']) fs.rmSync(path.join(dir, name), { force: true });
    fs.rmdirSync(dir);
  });
  async function send(value = payload, { event = 'push', id = 'delivery-1', sign = true, signature } = {}) {
    const body = JSON.stringify(value);
    return fetch(`${url}/github-webhook/`, { method: 'POST', body, headers: {
      'Content-Type': 'application/json', 'X-GitHub-Event': event, 'X-GitHub-Delivery': id,
      ...(sign ? { 'X-Hub-Signature-256': signature || `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}` } : {})
    } });
  }
  return { send, calls, url };
}

test('webhook rejects unsigned requests before queuing a deployment', async t => {
  const f = await fixture(t);
  assert.equal((await f.send(payload, { sign: false })).status, 403);
  assert.equal(f.calls.length, 0);
});
test('webhook rejects a tampered signature', async t => {
  const f = await fixture(t);
  assert.equal((await f.send(payload, { signature: `sha256=${'0'.repeat(64)}` })).status, 403);
  assert.equal(f.calls.length, 0);
});
test('valid GitHub ping is acknowledged without starting Jenkins', async t => {
  const f = await fixture(t);
  assert.equal((await f.send({}, { event: 'ping' })).status, 200);
  assert.equal(f.calls.length, 0);
});
test('webhook ignores another repository, branch, deleted ref and other events', async t => {
  const f = await fixture(t);
  for (const value of [{ ...payload, repository: { full_name: 'other/repo' } },
    { ...payload, ref: 'refs/heads/feature' }, { ...payload, deleted: true }]) {
    assert.equal((await f.send(value)).status, 200);
  }
  assert.equal((await f.send(payload, { event: 'pull_request' })).status, 200);
  assert.equal(f.calls.length, 0);
});
test('valid push passes exact Git SHA and delivery ID to Jenkins', async t => {
  const f = await fixture(t);
  assert.equal((await f.send()).status, 202);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].sha, payload.after);
  assert.equal(f.calls[0].delivery, 'delivery-1');
});
test('webhook deduplicates delivery retries and repeated commit notifications', async t => {
  const f = await fixture(t);
  await f.send();
  assert.equal((await (await f.send()).json()).status, 'duplicate');
  assert.equal((await (await f.send(payload, { id: 'delivery-2' })).json()).status, 'duplicate');
  assert.equal(f.calls.length, 1);
});
test('failed Jenkins enqueue returns 503 and remains retryable', async t => {
  let attempts = 0;
  const f = await fixture(t, async () => {
    if (++attempts === 1) throw new Error('offline');
    return '/queue/item/2/';
  });
  assert.equal((await f.send()).status, 503);
  assert.equal((await f.send()).status, 202);
  assert.equal(attempts, 2);
});
test('receiver exposes no Jenkins administration paths', async t => {
  const f = await fixture(t);
  assert.equal((await fetch(`${f.url}/login`)).status, 404);
  assert.equal((await fetch(`${f.url}/script`)).status, 404);
});
