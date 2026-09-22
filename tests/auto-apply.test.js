const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  AUTO_APPLY_DEFAULT_SCORE,
  isValidAutoApplyScore,
  normalizeAutoApplyScore,
  parseBoolean,
  qualifiesForAutoApply
} = require('../utils/autoApply');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('auto apply is threshold-based and parses explicit consent values', () => {
  assert.equal(AUTO_APPLY_DEFAULT_SCORE, 70);
  assert.equal(parseBoolean(true), true);
  assert.equal(parseBoolean('false'), false);
  assert.equal(parseBoolean('unexpected'), null);
  assert.equal(normalizeAutoApplyScore('80'), 80);
  assert.equal(isValidAutoApplyScore(29), false);
  assert.equal(isValidAutoApplyScore(70), true);
  assert.equal(qualifiesForAutoApply(69.9, 70), false);
  assert.equal(qualifiesForAutoApply(70, 70), true);
});

test('database migration keeps auto apply off by default', () => {
  const migration = read('supabase/migrations/20260922100000_auto_apply_opt_in.sql');
  assert.match(migration, /auto_apply_enabled BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(migration, /auto_apply_min_score NUMERIC\(5,2\) NOT NULL DEFAULT 70\.00/);
  assert.match(migration, /application_source VARCHAR\(20\) NOT NULL DEFAULT 'manual'/);
});

test('candidate must explicitly opt in and have a profile CV', () => {
  const controller = read('controllers/candidateController.js');
  const dashboard = read('public/candidate-dashboard.html');
  assert.match(controller, /autoApplyEnabled === true && !profile\.cv_url/);
  assert.match(dashboard, /id="auto_apply_enabled"/);
  assert.match(dashboard, /Mặc định luôn tắt/);
});

test('new jobs run matching and auto-created applications are auditable', () => {
  const jobController = read('controllers/jobController.js');
  const service = read('services/autoApplyService.js');
  assert.match(jobController, /evaluateNewJobForAutoApply/);
  assert.match(jobController, /auto_apply: autoApply/);
  assert.match(service, /applicationSource: 'auto_match'/);
  assert.match(service, /aiScore: score/);
  assert.match(service, /Hệ thống tự động ứng tuyển/);
});
