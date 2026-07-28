const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

test('v1.0.0 release notes include all required rubric sections', () => {
  const notes = read('docs/RELEASE_v1.0.0.md');
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
  assert.match(notes, /https:\/\/joblink-web\.onrender\.com/);
  assert.match(notes, /hieunofun/);
  assert.match(notes, /Nguyen16112006/);
  assert.match(notes, /Phuonganh149/);
});

test('release includes required final features', () => {
  const notes = read('docs/RELEASE_v1.0.0.md');
  [
    'AI Chatbot',
    'Resume Ranking',
    'Recommendation',
    'Dashboard',
    'Candidate Profile',
    'Employer Dashboard',
    'Search Filter',
    'Pagination',
    'Notification',
    'API Documentation'
  ].forEach((feature) => assert.match(notes, new RegExp(feature, 'i')));
});

test('AI routes expose chatbot, resume ranking, recommendation, and CV analysis', () => {
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

test('candidate and employer profile routes exist', () => {
  const candidateRoutes = read('routes/candidateRoutes.js');
  const companyRoutes = read('routes/companyRoutes.js');
  assert.match(candidateRoutes, /router\.get\('\/me'/);
  assert.match(candidateRoutes, /router\.put\('\/me'/);
  assert.match(candidateRoutes, /router\.post\('\/me\/cv'/);
  assert.match(companyRoutes, /router\.get\('\/me\/profile'/);
  assert.match(companyRoutes, /router\.put\('\/me\/profile'/);
});

test('documentation evidence exists for grading', () => {
  [
    'SELF_ASSESSMENT.md',
    'CHANGELOG.md',
    'docs/API.md',
    'docs/ARCHITECTURE.md',
    'docs/RELEASE_v1.0.0.md',
    'docs/DEPLOYMENT.md',
    'docs/RELEASE_TRACEABILITY.md',
    'docs/TEST_PLAN.md',
    'docs/USER_STORIES.md',
    'CONTRIBUTORS.md'
  ].forEach((file) => assert.equal(exists(file), true, `${file} should exist`));
});

test('package version matches the v1.0.0 final release line', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.version, '1.0.0');
});

test('configuration hygiene keeps secrets and the optional large model out of Git', () => {
  const gitignore = read('.gitignore');
  const renderConfig = read('render.yaml');
  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /^ai_service\/models\/cv_job_matching\/$/m);
  assert.equal(exists('.env.example'), true);
  assert.equal(exists('.gitattributes'), false);
  assert.match(renderConfig, /key: AI_LIGHTWEIGHT_MODE\s+value: ['"]true['"]/);
  [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET'
  ].forEach((key) => {
    assert.match(renderConfig, new RegExp(`key: ${key}\\s+sync: false`));
  });
});
