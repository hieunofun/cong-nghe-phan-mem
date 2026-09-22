const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { sanitizeChatJobs } = require('../controllers/aiController');
const { extractProfileFields } = require('../utils/cvTextExtractor');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('chatbot job links are generated only from validated job IDs', () => {
  const jobs = sanitizeChatJobs([
    { id: '17', title: '<Senior Developer>', company_name: 'JobLink', url: 'javascript:alert(1)' },
    { id: '-2', title: 'Invalid' },
    { id: 'not-a-number', title: 'Invalid' }
  ]);

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].id, 17);
  assert.equal(jobs[0].url, '/job-detail.html?id=17');

  const widget = read('public/js/chatbot-widget.js');
  assert.match(widget, /href="\/job-detail\.html\?id=\$\{job\.id\}"/);
  assert.match(widget, /data\.jobs \|\| \[\]/);
  assert.match(widget, /Xem chi tiết công việc/);
});

test('CV profile extraction supports Vietnamese section labels', () => {
  const fields = extractProfileFields(`
Họ và tên: Nguyễn Văn An
Số điện thoại: 0912 345 678
Địa chỉ: Hà Nội
Ngày sinh: 15/08/2001
Giới tính: Nam
HỌC VẤN
Đại học Bách Khoa Hà Nội
KINH NGHIỆM LÀM VIỆC
2 năm phát triển phần mềm
KỸ NĂNG
Python
SQL
  `);

  assert.equal(fields.full_name, 'Nguyễn Văn An');
  assert.equal(fields.phone, '0912345678');
  assert.equal(fields.gender, 'male');
  assert.match(fields.education, /Bách Khoa/);
  assert.match(fields.experience, /phát triển phần mềm/);
});

test('CV profile extraction supports English section labels', () => {
  const fields = extractProfileFields(`
Full name: Alex Nguyen
Phone: +84912345678
Address: Ho Chi Minh City
Date of birth: 21/09/2000
Gender: Female
EDUCATION
Bachelor of Computer Science
WORK EXPERIENCE
Three years as a Software Engineer
SKILLS
JavaScript
Node.js
  `);

  assert.equal(fields.full_name, 'Alex Nguyen');
  assert.equal(fields.phone, '+84912345678');
  assert.equal(fields.gender, 'female');
  assert.match(fields.education, /Computer Science/);
  assert.match(fields.experience, /Software Engineer/);
});
