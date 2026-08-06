const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { safeDbNumber } = require('../utils/dbNumbers');
const { VIP_FIRST_JOB_ORDER_SQL, sortJobsVipFirst } = require('../utils/jobOrdering');

const root = path.resolve(__dirname, '..');

test('job ordering always puts VIP and featured jobs before normal jobs', () => {
  assert.match(VIP_FIRST_JOB_ORDER_SQL, /^j\.is_vip DESC, j\.is_featured DESC/);

  const jobs = sortJobsVipFirst([
    { id: 1, is_vip: false, created_at: '2026-08-06T10:00:00Z' },
    { id: 2, is_vip: true, created_at: '2026-08-01T10:00:00Z' },
    { id: 3, is_featured: true, created_at: '2026-08-05T10:00:00Z' }
  ]);

  assert.deepEqual(jobs.map((job) => job.id), [2, 3, 1]);
});

test('PostgreSQL numeric strings are normalized for admin statistics', () => {
  assert.equal(safeDbNumber({ total_users: '12' }, 'total_users'), 12);
  assert.equal(safeDbNumber({}, 'total_users'), 0);
  assert.equal(safeDbNumber({ total_users: 'invalid' }, 'total_users'), 0);
});

test('admin overview renders an icon and a safe fallback for every statistic card', () => {
  const source = fs.readFileSync(path.join(root, 'public/js/admin-dashboard.js'), 'utf8');
  assert.equal((source.match(/class="stat-icon"/g) || []).length, 9);
  assert.equal((source.match(/\?\? 0/g) || []).length >= 7, true);
});
