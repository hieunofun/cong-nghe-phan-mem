const assert = require('node:assert/strict');
const test = require('node:test');

const { withAccessibleCVUrls } = require('../services/storageService');

test('application lists survive a missing legacy CV object', async () => {
  const records = [
    { id: 1, cv_url: null },
    { id: 2, cv_url: 'supabase://joblink-cv/cv/old.pdf' }
  ];

  const result = await withAccessibleCVUrls(records, async (storedValue) => {
    if (!storedValue) return null;
    throw new Error('Object not found');
  });
  assert.equal(result.length, 2);
  assert.equal(result[0].cv_url, null);
  assert.equal(result[1].cv_url, null);
});
