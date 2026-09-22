const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('application creation records the initial lifecycle event', () => {
  const model = read('models/applicationModel.js');
  assert.match(model, /INSERT INTO application_status_history/);
  assert.match(model, /Ứng viên gửi hồ sơ ứng tuyển/);
  assert.match(model, /from_status, to_status/);
});

test('candidate can read only the lifecycle route authorized by the controller', () => {
  const routes = read('routes/applicationRoutes.js');
  const controller = read('controllers/applicationController.js');
  assert.match(routes, /requireRole\('company', 'candidate'\)/);
  assert.match(controller, /application\.candidate_id !== candidate\.id/);
  assert.match(controller, /application\.company_id !== company\.id/);
});

test('submitted CV references survive later profile CV replacement', () => {
  const candidateController = read('controllers/candidateController.js');
  const applicationModel = read('models/applicationModel.js');
  assert.match(candidateController, /applicationModel\.isCVReferenced\(profile\.cv_url\)/);
  assert.match(applicationModel, /async function isCVReferenced/);
  assert.match(applicationModel, /WHERE cv_url = \?/);
});

test('candidate dashboard exposes current stage and application history', () => {
  const dashboard = read('public/js/candidate-dashboard.js');
  assert.match(dashboard, /APPLICATION_LIFECYCLE_STAGES/);
  assert.match(dashboard, /data-application-history/);
  assert.match(dashboard, /\/applications\/\$\{application\.id\}\/history/);
  assert.match(dashboard, /Xem CV đã nộp/);
});

test('lifecycle migration stores CV metadata and permits the initial null state', () => {
  const migration = read('supabase/migrations/20260921180000_candidate_lifecycle_cv_tracking.sql');
  assert.match(migration, /cv_filename/);
  assert.match(migration, /cv_source/);
  assert.match(migration, /ALTER COLUMN from_status DROP NOT NULL/);
  assert.match(migration, /NULL::application_status/);
});
