// Only this small HMAC-protected receiver is exposed through the demo tunnel.
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { client } = require('./lib/jenkins-client');

function validSignature(body, header, secret) {
  if (typeof header !== 'string' || !/^sha256=[0-9a-f]{64}$/.test(header)) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(header.slice(7), 'hex'));
}

function createReceiver({ secret, repository = 'hieunofun/cong-nghe-phan-mem', branch = 'main',
  ledgerFile, instanceId = crypto.randomUUID(), enqueue, log = console.log }) {
  if (!secret || !ledgerFile || !enqueue) throw new Error('secret, ledgerFile and enqueue are required');
  let deliveries = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) : [];
  const inFlight = new Set();
  function record(value) {
    deliveries = deliveries.filter(item => item.id !== value.id).slice(-199);
    deliveries.push(value);
    fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
    const temporary = `${ledgerFile}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(deliveries, null, 2)}\n`);
    fs.renameSync(temporary, ledgerFile);
  }
  return http.createServer(async (req, res) => {
    const reply = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    };
    if (req.method === 'GET' && req.url === '/health') return reply(200, { status: 'ok', instanceId });
    if (req.method !== 'POST' || req.url !== '/github-webhook/') return reply(404, { error: 'not found' });
    let size = 0;
    const chunks = [];
    try {
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024 * 1024) return reply(413, { error: 'payload too large' });
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks);
      if (!validSignature(raw, req.headers['x-hub-signature-256'], secret)) {
        return reply(403, { error: 'invalid signature' });
      }
      const event = req.headers['x-github-event'];
      const id = req.headers['x-github-delivery'];
      if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(id)) return reply(400, { error: 'invalid delivery ID' });
      if (event === 'ping') {
        log(`${new Date().toISOString()} ping ${id}`);
        return reply(200, { status: 'pong' });
      }
      const payload = JSON.parse(raw.toString('utf8'));
      if (event !== 'push' || payload.repository?.full_name !== repository ||
          payload.ref !== `refs/heads/${branch}` || payload.deleted) {
        return reply(200, { status: 'ignored' });
      }
      if (!/^[0-9a-f]{40}$/.test(payload.after || '')) return reply(400, { error: 'invalid commit SHA' });
      const previous = deliveries.find(item => (item.id === id || item.sha === payload.after) && item.status === 'queued');
      if (previous || inFlight.has(id) || inFlight.has(payload.after)) return reply(200, { status: 'duplicate' });
      inFlight.add(id);
      inFlight.add(payload.after);
      try {
        const queuePath = await enqueue({ sha: payload.after, delivery: id, repository, branch });
        const result = { id, sha: payload.after, event, repository, ref: payload.ref,
          status: 'queued', queuePath, receivedAt: new Date().toISOString() };
        record(result);
        log(`${result.receivedAt} push ${id} ${payload.after} queued ${queuePath}`);
        return reply(202, { status: 'queued', queuePath });
      } catch (error) {
        record({ id, sha: payload.after, status: 'failed', receivedAt: new Date().toISOString() });
        log(`${new Date().toISOString()} delivery ${id} enqueue failed: ${error.message}`);
        return reply(503, { error: 'Jenkins unavailable; redeliver this event after recovery' });
      } finally {
        inFlight.delete(id);
        inFlight.delete(payload.after);
      }
    } catch (error) {
      log(`${new Date().toISOString()} request rejected: ${error.name}`);
      if (!res.headersSent) reply(400, { error: 'invalid payload' });
    }
  });
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const config = JSON.parse(fs.readFileSync(path.join(root, '.devops/webhook-config.json'), 'utf8'));
  const jenkins = client();
  const server = createReceiver({
    ...config, ledgerFile: path.join(root, '.devops/webhook-deliveries.json'),
    enqueue: ({ sha, delivery, branch }) => jenkins.enqueue('joblink-scm', {
      SOURCE_MODE: 'SCM', DEPLOY: 'true', GIT_URL: `https://github.com/${config.repository}.git`,
      GIT_BRANCH: branch, GIT_COMMIT: sha, WEBHOOK_DELIVERY: delivery
    })
  });
  server.requestTimeout = 30000;
  server.listen(config.port, '127.0.0.1', () => console.log(`Webhook receiver listening on 127.0.0.1:${config.port}`));
}

module.exports = { createReceiver, validSignature };
