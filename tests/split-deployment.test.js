const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Express backend is exportable as a Vercel Function in the Supabase region', () => {
  const server = read('server.js');
  const vercel = JSON.parse(read('vercel.json'));
  const packageJson = JSON.parse(read('package.json'));

  assert.match(server, /if \(require\.main === module\)/);
  assert.match(server, /module\.exports = app/);
  assert.deepEqual(vercel.regions, ['bom1']);
  assert.equal(vercel.framework, 'express');
  assert.equal(vercel.buildCommand, undefined);
  assert.equal(packageJson.engines.node, '>=20');
});

test('cross-origin frontend requests use an explicit allowlist', () => {
  const server = read('server.js');
  assert.match(server, /process\.env\.FRONTEND_URL/);
  assert.match(server, /process\.env\.CORS_ORIGINS/);
  assert.match(server, /Access-Control-Allow-Origin/);
  assert.match(server, /Authorization, Content-Type/);
});

test('every HTML page that calls the API loads generated environment first', () => {
  const publicDirectory = path.join(root, 'public');
  const pages = fs.readdirSync(publicDirectory).filter((name) => name.endsWith('.html'));
  for (const page of pages) {
    const html = fs.readFileSync(path.join(publicDirectory, page), 'utf8');
    const apiIndex = html.indexOf('/js/api.js');
    if (apiIndex < 0) continue;
    const envIndex = html.indexOf('/js/env.js');
    assert.ok(envIndex >= 0 && envIndex < apiIndex, `${page} must load env.js before api.js`);
  }
});

test('chatbot and OAuth redirects respect the split frontend/backend origins', () => {
  const chatbot = read('public/js/chatbot-widget.js');
  const oauthRoutes = read('routes/oauthRoutes.js');
  const authController = read('controllers/authController.js');

  assert.match(chatbot, /window\.JOBLINK_API_BASE \|\| '\/api'/);
  assert.match(oauthRoutes, /getFrontendBaseUrl/);
  assert.match(oauthRoutes, /frontendUrl\(`\/auth-callback\.html/);
  assert.match(authController, /getFrontendBaseUrl/);
});

test('CV upload stays below the Vercel Function payload ceiling', () => {
  const upload = read('middleware/upload.js');
  const jobDetail = read('public/js/job-detail.js');
  assert.match(upload, /fileSize: 4 \* 1024 \* 1024/);
  assert.match(jobDetail, /tối đa 4MB/);
});
