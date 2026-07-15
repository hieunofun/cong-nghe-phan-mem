const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { isValidEmail, validatePassword } = require('../utils/authValidation');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('email validation accepts normal addresses and rejects malformed input', () => {
  assert.equal(isValidEmail('candidate@joblink.vn'), true);
  assert.equal(isValidEmail('candidate@'), false);
  assert.equal(isValidEmail('not-an-email'), false);
});

test('registration password policy requires length, mixed case, and a number', () => {
  assert.match(validatePassword('Short1'), /8/);
  assert.match(validatePassword('alllowercase1'), /chữ hoa/);
  assert.equal(validatePassword('JobLink123'), null);
});

test('auth routes expose forgot and reset password endpoints', () => {
  const routes = read('routes/authRoutes.js');
  assert.match(routes, /router\.post\('\/forgot-password'/);
  assert.match(routes, /router\.post\('\/reset-password'/);
});

test('registration requires terms and provides legal documents', () => {
  const register = read('public/register.html');
  const controller = read('controllers/authController.js');
  assert.match(register, /id="terms" required/);
  assert.match(register, /\/terms\.html/);
  assert.match(register, /\/privacy\.html/);
  assert.match(controller, /terms_accepted !== true/);
  assert.equal(fs.existsSync(path.join(root, 'public/terms.html')), true);
  assert.equal(fs.existsSync(path.join(root, 'public/privacy.html')), true);
});

test('password reset tokens are hashed, expiring, and single-use', () => {
  const controller = read('controllers/authController.js');
  const model = read('models/passwordResetModel.js');
  assert.match(controller, /createHash\('sha256'\)/);
  assert.match(model, /expires_at > NOW\(\)/);
  assert.match(model, /used_at IS NULL/);
  assert.match(model, /SET used_at = NOW\(\)/);
});
