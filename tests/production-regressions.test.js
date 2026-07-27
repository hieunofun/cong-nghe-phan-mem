const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { normalizeAIServiceUrl } = require('../utils/aiServiceUrl');
const {
  DEFAULT_AI_RETRY_DELAYS_MS,
  parseAIRetryDelays,
  isRetryableAIError
} = require('../utils/aiRetry');
const { effectivePaymentStatus } = require('../utils/paymentStatus');
const root = path.resolve(__dirname, '..');

test('AI service URL accepts both a complete URL and a Render hostname', () => {
  assert.equal(
    normalizeAIServiceUrl({ serviceUrl: 'https://joblink-ai.onrender.com/' }),
    'https://joblink-ai.onrender.com'
  );
  assert.equal(
    normalizeAIServiceUrl({ serviceHost: 'joblink-ai.onrender.com' }),
    'https://joblink-ai.onrender.com'
  );
  assert.equal(
    normalizeAIServiceUrl({ serviceHost: 'https://joblink-ai.onrender.com/' }),
    'https://joblink-ai.onrender.com'
  );
});

test('AI service URL keeps local development on HTTP', () => {
  assert.equal(
    normalizeAIServiceUrl({ serviceUrl: 'localhost:5000' }),
    'http://localhost:5000'
  );
  assert.equal(normalizeAIServiceUrl(), 'http://127.0.0.1:5000');
});

test('Render passes the complete external AI URL to the web service', () => {
  const renderConfig = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
  assert.match(
    renderConfig,
    /key: AI_SERVICE_URL\s+fromService:\s+type: web\s+name: joblink-ai\s+envVarKey: RENDER_EXTERNAL_URL/
  );
});

test('AI bridge retries transient Render cold-start responses', () => {
  assert.deepEqual(parseAIRetryDelays('100, 250, invalid, -1'), [100, 250]);
  assert.deepEqual(parseAIRetryDelays(''), DEFAULT_AI_RETRY_DELAYS_MS);
  assert.equal(isRetryableAIError({ code: 'AI_CONNECTION_ERROR' }), true);
  assert.equal(isRetryableAIError({ code: 'AI_INVALID_RESPONSE' }), true);
  assert.equal(isRetryableAIError({ aiStatus: 502 }), true);
  assert.equal(isRetryableAIError({ aiStatus: 400 }), false);
  assert.equal(isRetryableAIError({ code: 'AI_TIMEOUT' }), false);
});

test('expired pending payments are mapped in JavaScript without mixing PostgreSQL enum types', () => {
  const now = Date.parse('2026-07-27T12:00:00Z');
  assert.equal(
    effectivePaymentStatus({ status: 'pending', expires_at: '2026-07-27T11:59:59Z' }, now),
    'expired'
  );
  assert.equal(
    effectivePaymentStatus({ status: 'pending', expires_at: '2026-07-27T12:00:01Z' }, now),
    'pending'
  );
  assert.equal(
    effectivePaymentStatus({ status: 'completed', expires_at: '2026-07-27T11:59:59Z' }, now),
    'completed'
  );
});
