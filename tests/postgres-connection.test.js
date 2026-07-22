const assert = require('node:assert/strict');
const test = require('node:test');

const { removeConnectionStringSslOptions } = require('../utils/postgresConnection');

test('removes sslmode so the explicit PostgreSQL TLS configuration is retained', () => {
  const source = 'postgresql://postgres.example:p%40ss@pooler.example.com:5432/postgres?sslmode=require&application_name=joblink';
  const result = removeConnectionStringSslOptions(source);
  const parsed = new URL(result);

  assert.equal(parsed.searchParams.has('sslmode'), false);
  assert.equal(parsed.searchParams.get('application_name'), 'joblink');
  assert.equal(parsed.password, 'p%40ss');
});

test('removes certificate query options that would replace the explicit ssl object', () => {
  const source = 'postgres://user:pass@host/db?sslcert=client.crt&sslkey=client.key&sslrootcert=root.crt';
  const parsed = new URL(removeConnectionStringSslOptions(source));

  assert.equal(parsed.searchParams.has('sslcert'), false);
  assert.equal(parsed.searchParams.has('sslkey'), false);
  assert.equal(parsed.searchParams.has('sslrootcert'), false);
});

test('leaves non-PostgreSQL and malformed values unchanged', () => {
  assert.equal(removeConnectionStringSslOptions('mysql://localhost/db?sslmode=require'), 'mysql://localhost/db?sslmode=require');
  assert.equal(removeConnectionStringSslOptions('not a url'), 'not a url');
});
