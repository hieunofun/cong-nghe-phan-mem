// Read-only smoke check of the local Docker demo; needs only Node.js >= 20.
const assert = require('node:assert/strict');

const base = (process.env.JOBLINK_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
let passed = 0;

async function request(path, { token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000)
  });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
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
  await check('Web health', async () => {
    assert.equal((await request('/health')).status, 'ok');
  });
  await check('Home page and local frontend config', async () => {
    assert.match(await request('/'), /JobLink/i);
    assert.match(await request('/js/env.js'), /JOBLINK_API_BASE_URL\s*=\s*""/);
  });
  let job;
  await check('MySQL demo jobs and search', async () => {
    const jobs = await request('/api/jobs');
    assert.ok(jobs.total >= 4, 'Expected at least 4 seeded jobs');
    job = jobs.jobs.find(item => /Node\.js/.test(item.title));
    assert.ok(job, 'Missing demo Node.js job');
    const search = await request('/api/jobs?keyword=Node.js');
    assert.ok(search.jobs.some(item => item.id === job.id));
    const categories = await request('/api/categories');
    assert.ok(categories.length >= 8);
    const tech = categories.find(item => item.slug === 'cong-nghe-thong-tin');
    assert.equal(tech?.name, 'Công nghệ thông tin', 'MySQL init must preserve UTF-8 accents');
    const filtered = await request(`/api/jobs?category_id=${tech.id}`);
    assert.ok(filtered.jobs.some(item => item.id === job.id), 'Demo jobs must have their category');
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
  await check('AI health through Web -> AI container', async () => {
    const health = await request('/api/ai/health');
    assert.equal(health.online, true);
    assert.equal(health.deployment_mode, 'lightweight');
    assert.ok(health.models.chatbot_documents > 0);
  });
  await check('AI chatbot through Web -> AI -> MySQL', async () => {
    const chat = await request('/api/ai/chat', { body: { message: 'Tìm việc Node.js', history: [] } });
    assert.ok(chat.reply?.length > 0);
    assert.ok(chat.jobs?.some(item => item.id === job.id), 'Chatbot should retrieve the seeded Node.js job');
  });
  await check('AI CV matching, recommendations and analysis', async () => {
    const options = { token: tokens.candidate };
    const match = await request(`/api/ai/match/${job.id}`, options);
    assert.ok(Number.isFinite(match.score) && match.score >= 0 && match.score <= 100);
    assert.ok(Array.isArray((await request('/api/ai/recommend', options)).recommendations));
    const analysis = await request('/api/ai/analyze-cv', options);
    assert.ok(analysis && typeof analysis === 'object');
  });
  console.log(`${passed}/${passed} Docker demo checks passed. Target: ${base}`);
}

main().catch(error => {
  console.error(`FAIL after ${passed} checks: ${error.message}`);
  process.exitCode = 1;
});
