const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

test('AI client retries cold-start failures but not normal client errors', async (t) => {
  let mode = 'cold-start';
  let attempts = 0;
  const server = http.createServer((_req, res) => {
    attempts += 1;
    if (mode === 'cold-start' && attempts <= 2) {
      res.writeHead(502, { 'Content-Type': 'text/html' });
      res.end('<html>starting service</html>');
      return;
    }
    if (mode === 'client-error') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'bad request' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  process.env.AI_SERVICE_URL = `http://127.0.0.1:${address.port}`;
  process.env.AI_RETRY_DELAYS_MS = '10,10';
  const { getAIHealth } = require('../services/aiServiceClient');

  const health = await getAIHealth();
  assert.equal(health.status, 'ok');
  assert.equal(attempts, 3);

  mode = 'client-error';
  attempts = 0;
  await assert.rejects(getAIHealth(), (error) => {
    assert.equal(error.aiStatus, 400);
    return true;
  });
  assert.equal(attempts, 1);
});
