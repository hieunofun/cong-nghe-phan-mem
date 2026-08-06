const assert = require('node:assert/strict');
const test = require('node:test');

const {
  getCvSelectionStatus,
  resolveCandidateContext
} = require('../public/js/job-detail');

test('CV stored in the candidate profile is kept when another context request fails', () => {
  const profile = { id: 7, cv_url: '/uploads/cv/resume.pdf' };
  const context = resolveCandidateContext([
    { status: 'fulfilled', value: profile },
    { status: 'rejected', reason: new Error('saved jobs unavailable') },
    { status: 'fulfilled', value: [] }
  ], 42);

  assert.equal(context.profile, profile);
  assert.equal(context.profile.cv_url, '/uploads/cv/resume.pdf');
  assert.equal(context.hasApplied, false);
  assert.equal(context.isSaved, false);
});

test('application state takes priority over saved-job state', () => {
  const context = resolveCandidateContext([
    { status: 'fulfilled', value: { cv_url: '/resume.pdf' } },
    { status: 'fulfilled', value: [{ id: 42 }] },
    { status: 'fulfilled', value: [{ job_id: 42 }] }
  ], 42);

  assert.equal(context.hasApplied, true);
  assert.equal(context.isSaved, false);
});

test('selecting a CV replaces the missing-CV error with a success state', () => {
  assert.equal(getCvSelectionStatus(false).type, 'error');

  const selected = getCvSelectionStatus(false, 'Hieu-Phan-CV.pdf');
  assert.equal(selected.type, 'success');
  assert.match(selected.message, /Hieu-Phan-CV\.pdf/);
});

test('an existing profile CV is announced when no replacement file is selected', () => {
  const status = getCvSelectionStatus(true);
  assert.equal(status.type, 'info');
  assert.match(status.message, /CV hiện có/);
});
