// Comprehensive post-deployment smoke check of the Docker stack; needs only Node.js >= 20.
const assert = require('node:assert/strict');

const base = (process.env.JOBLINK_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const gateway = (process.env.JOBLINK_GATEWAY_URL || 'http://127.0.0.1:8088').replace(/\/$/, '');
let passed = 0;

async function request(urlPath, { baseUrl = base, token, body, expectedStatus = 200, rawResponse = false } = {}) {
  const response = await fetch(`${baseUrl}${urlPath}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000)
  });
  assert.equal(response.status, expectedStatus, `${baseUrl}${urlPath}: HTTP ${response.status}`);
  if (rawResponse) return response;
  return response.headers.get('content-type')?.includes('application/json')
    ? response.json()
    : response.text();
}

async function check(label, fn) {
  await fn();
  passed += 1;
  console.log(`PASS ${label}`);
}

async function main() {
  let webEnv = 'production';
  await check('Web liveness (/health) and security headers', async () => {
    const res = await request('/health', { rawResponse: true });
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(res.headers.get('x-powered-by'), null);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    webEnv = body.env || 'development';
  });

  await check('Database readiness (/ready)', async () => {
    const ready = await request('/ready');
    assert.equal(ready.status, 'ready');
    assert.equal(ready.database, 'ok');
  });

  await check('Home page and local frontend config', async () => {
    assert.match(await request('/'), /JobLink/i);
    assert.match(await request('/js/env.js'), /JOBLINK_API_BASE_URL\s*=\s*""/);
  });

  let job;
  await check('MySQL demo jobs and UTF-8 search', async () => {
    const jobs = await request('/api/jobs');
    assert.ok(jobs.total >= 4, 'Expected at least 4 seeded jobs');
    job = jobs.jobs.find((item) => /Node\.js/.test(item.title));
    assert.ok(job, 'Missing demo Node.js job');
    const search = await request('/api/jobs?keyword=Node.js');
    assert.ok(search.jobs.some((item) => item.id === job.id));
    const categories = await request('/api/categories');
    assert.ok(categories.length >= 8);
    const tech = categories.find((item) => item.slug === 'cong-nghe-thong-tin');
    assert.equal(tech?.name, 'Công nghệ thông tin', 'MySQL init must preserve UTF-8 accents');
    const filtered = await request(`/api/jobs?category_id=${tech.id}`);
    assert.ok(filtered.jobs.some((item) => item.id === job.id), 'Demo jobs must have their category');
  });

  const tokens = {};
  for (const [role, email, password] of [
    ['admin', 'admin@joblink.vn', 'Admin@123'],
    ['company', 'hr@vietsoft.vn', 'Company@123'],
    ['candidate', 'candidate@joblink.vn', 'Candidate@123']
  ]) {
    await check(`Login and protected profile: ${role}`, async () => {
      const result = await request('/api/auth/login', { body: { email, password } });
      assert.equal(result.user.role, role);
      assert.ok(result.token);
      tokens[role] = result.token;
      assert.equal((await request('/api/auth/me', { token: result.token })).user.role, role);
    });
  }

  await check('Production password-reset token leak protection', async () => {
    const forgot = await request('/api/auth/forgot-password', {
      body: { email: 'candidate@joblink.vn' }
    });
    if (webEnv === 'production') {
      assert.equal(forgot.reset_url, undefined, 'Production mode must never expose reset_url in JSON');
    }
  });

  await check('Admin dashboard data', async () => {
    const stats = await request('/api/admin/stats', { token: tokens.admin });
    assert.ok(stats.totalUsers >= 4);
    assert.ok(stats.totalJobs >= 4);
  });

  await check('Company dashboard data', async () => {
    const jobs = await request('/api/jobs/company/my-jobs', { token: tokens.company });
    assert.ok(jobs.length >= 2);
    assert.equal((await request('/api/companies/me/profile', { token: tokens.company })).status, 'approved');
    await request('/api/applications/stats', { token: tokens.company });
  });

  await check('Candidate dashboard data', async () => {
    assert.ok((await request('/api/candidates/me', { token: tokens.candidate })).full_name);
    await request('/api/candidates/me/applications', { token: tokens.candidate });
    await request('/api/candidates/me/saved-jobs', { token: tokens.candidate });
  });

  await check('AI health through Web -> AI (authenticated bridge)', async () => {
    const health = await request('/api/ai/health');
    assert.equal(health.online, true);
    assert.equal(health.deployment_mode, 'lightweight');
    assert.ok(health.models.chatbot_documents > 0);
  });

  await check('AI chatbot through Web -> AI -> MySQL', async () => {
    const chat = await request('/api/ai/chat', { body: { message: 'Tìm việc Node.js', history: [] } });
    assert.ok(chat.reply?.length > 0);
    assert.ok(chat.jobs?.some((item) => item.id === job.id), 'Chatbot should retrieve the seeded Node.js job');
  });

  await check('AI CV matching, recommendations and analysis', async () => {
    const options = { token: tokens.candidate };
    const match = await request(`/api/ai/match/${job.id}`, options);
    assert.ok(Number.isFinite(match.score) && match.score >= 0 && match.score <= 100);
    assert.ok(Array.isArray((await request('/api/ai/recommend', options)).recommendations));
    const analysis = await request('/api/ai/analyze-cv', options);
    assert.ok(analysis && typeof analysis === 'object');
  });

  await check('White-box Prometheus metrics (/metrics)', async () => {
    const metricsText = await request('/metrics');
    assert.match(metricsText, /joblink_http_requests_total/);
    assert.match(metricsText, /nodejs_resident_memory_bytes/);
    assert.match(metricsText, /joblink_http_request_duration_seconds_bucket/);
  });

  await check('Nginx Reverse Proxy Gateway and internal path shielding', async () => {
    const gwHealth = await request('/gateway-health', { baseUrl: gateway });
    assert.equal(gwHealth.status, 'ok');
    const gwHome = await request('/', { baseUrl: gateway, rawResponse: true });
    assert.equal(gwHome.headers.get('x-proxy-gateway'), 'joblink-nginx');
    assert.match(await gwHome.text(), /JobLink/i);
    await request('/metrics', { baseUrl: gateway, expectedStatus: 403 });
    await request('/internal/alert-webhook', { baseUrl: gateway, expectedStatus: 403 });
  });

  console.log(`${passed}/${passed} Docker smoke checks passed. Target: ${base} | Gateway: ${gateway}`);
}

main().catch((error) => {
  console.error(`FAIL after ${passed} checks: ${error.message}`);
  process.exitCode = 1;
});
