const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('v0.2 release documentation exists with required sections', () => {
  const notes = read('docs/RELEASE_v0.2.md');
  [
    'Release Title',
    'Release Notes',
    'Features',
    'Enhancements',
    'Bug Fixes',
    'Known Issues',
    'Migration Notes',
    'Deployment Notes',
    'Testing Summary'
  ].forEach((section) => assert.match(notes, new RegExp(section)));
});

test('AI chatbot, resume ranking, and recommendation routes are registered', () => {
  const routes = read('routes/aiRoutes.js');
  assert.match(routes, /router\.post\('\/chat'/);
  assert.match(routes, /router\.get\('\/match\/:jobId'/);
  assert.match(routes, /router\.get\('\/recommend'/);
  assert.match(routes, /router\.get\('\/analyze-cv'/);
});

test('job search supports filters and pagination', () => {
  const controller = read('controllers/jobController.js');
  ['keyword', 'category_id', 'location', 'job_type', 'salary_min', 'page', 'limit', 'totalPages']
    .forEach((token) => assert.match(controller, new RegExp(token)));
});

test('candidate and employer dashboard profile routes exist', () => {
  const candidateRoutes = read('routes/candidateRoutes.js');
  const companyRoutes = read('routes/companyRoutes.js');
  assert.match(candidateRoutes, /router\.get\('\/me'/);
  assert.match(candidateRoutes, /router\.put\('\/me'/);
  assert.match(companyRoutes, /router\.get\('\/me\/profile'/);
  assert.match(companyRoutes, /router\.put\('\/me\/profile'/);
});

test('configuration hygiene keeps secrets out and tracks large model via LFS', () => {
  const gitignore = read('.gitignore');
  const attrs = read('.gitattributes');
  assert.match(gitignore, /^\.env$/m);
  assert.ok(fs.existsSync(path.join(root, '.env.example')));
  assert.match(attrs, /ai_service\/models\/cv_job_matching\/model\.safetensors filter=lfs/);
});

