const fs = require('fs/promises');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const { downloadStoredFile, storedFileExtension } = require('../services/storageService');

const CV_DIRECTORY = path.resolve(__dirname, '..', 'uploads', 'cv');
const MAX_AI_TEXT_LENGTH = 12000;

function cleanText(value) {
  return String(value || '')
    .replace(/\u0000/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

const SECTION_HEADINGS = new Set([
  'THONG TIN CA NHAN', 'PERSONAL INFORMATION',
  'VI TRI UNG TUYEN', 'POSITION',
  'MUC TIEU NGHE NGHIEP', 'CAREER OBJECTIVE',
  'HOC VAN', 'EDUCATION',
  'KINH NGHIEM LAM VIEC', 'KINH NGHIEM', 'WORK EXPERIENCE', 'EXPERIENCE',
  'DU AN CA NHAN', 'DU AN', 'PROJECTS',
  'KY NANG', 'SKILLS',
  'NGOAI NGU', 'LANGUAGES',
  'CHUNG CHI', 'CERTIFICATES', 'CERTIFICATIONS',
  'SO THICH', 'INTERESTS',
  'NGUOI THAM CHIEU', 'REFERENCES'
]);

function valueFromLabel(cvText, labels) {
  const normalizedLabels = new Set(labels.map(normalizeKey));
  for (const rawLine of String(cvText).split('\n')) {
    const line = rawLine.trim();
    const colonIndex = line.indexOf(':');
    if (colonIndex < 0) continue;
    if (normalizedLabels.has(normalizeKey(line.slice(0, colonIndex)))) {
      return cleanText(line.slice(colonIndex + 1));
    }
  }
  return '';
}

function extractSection(cvText, headings) {
  const wanted = new Set(headings.map(normalizeKey));
  const lines = String(cvText).split('\n');
  let collecting = false;
  const result = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const normalized = normalizeKey(line);
    if (!collecting && wanted.has(normalized)) {
      collecting = true;
      continue;
    }
    if (collecting && SECTION_HEADINGS.has(normalized)) break;
    if (collecting && line) result.push(line.replace(/^[•\-*]\s*/, ''));
  }
  return cleanText(result.join('\n'));
}

function parseBirthDate(value) {
  const match = String(value).match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (!match) return '';
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isMeaningfulValue(value) {
  const compact = String(value || '').replace(/[.\-_…•\s]/g, '');
  return compact.length >= 2;
}

function isLikelyBlankCVTemplate(cvText) {
  const text = String(cvText || '');
  const placeholderCount = text.split('\n').filter((line) => /\.{8,}/.test(line)).length;
  if (placeholderCount < 3) return false;

  const coreValues = [
    valueFromLabel(text, ['Họ và tên', 'Họ tên', 'Full name', 'Name']),
    valueFromLabel(text, ['Số điện thoại', 'Điện thoại', 'Phone', 'Mobile']),
    valueFromLabel(text, ['Địa chỉ', 'Address']),
    valueFromLabel(text, ['Ngày sinh', 'Date of birth', 'Birthday'])
  ];
  return !coreValues.some(isMeaningfulValue);
}

function extractProfileFields(cvText, analysis = {}) {
  if (isLikelyBlankCVTemplate(cvText)) return {};

  const fields = {};
  const fullName = valueFromLabel(cvText, ['Họ và tên', 'Họ tên', 'Full name', 'Name']);
  const phone = valueFromLabel(cvText, ['Số điện thoại', 'Điện thoại', 'Phone', 'Mobile']).replace(/[\s.-]/g, '');
  const address = valueFromLabel(cvText, ['Địa chỉ', 'Address']);
  const birthDate = parseBirthDate(valueFromLabel(cvText, ['Ngày sinh', 'Date of birth', 'Birthday']));
  const genderText = normalizeKey(valueFromLabel(cvText, ['Giới tính', 'Gender']));
  const education = extractSection(cvText, ['Học vấn', 'Education']);
  const experience = extractSection(cvText, ['Kinh nghiệm làm việc', 'Kinh nghiệm', 'Work experience', 'Experience']);
  const skillSection = extractSection(cvText, ['Kỹ năng', 'Skills']);

  const detectedSkills = [
    ...(Array.isArray(analysis.tech_skills) ? analysis.tech_skills : []),
    ...(Array.isArray(analysis.soft_skills) ? analysis.soft_skills : [])
  ];
  const fallbackSkills = skillSection
    ? skillSection.split('\n').map((item) => item.trim()).filter((item) => item && item.length <= 80)
    : [];
  const skills = [...new Set((detectedSkills.length ? detectedSkills : fallbackSkills).map(cleanText))];

  if (isMeaningfulValue(fullName) && fullName.length <= 150) fields.full_name = fullName;
  if (/^\+?\d{9,15}$/.test(phone)) fields.phone = phone;
  if (isMeaningfulValue(address) && address.length <= 255) fields.address = address;
  if (birthDate) fields.birth_date = birthDate;
  if (genderText === 'NAM' || genderText === 'MALE') fields.gender = 'male';
  if (genderText === 'NU' || genderText === 'FEMALE') fields.gender = 'female';
  if (genderText === 'KHAC' || genderText === 'OTHER') fields.gender = 'other';
  if (skills.length) fields.skills = skills.join(', ').slice(0, 4000);
  if (experience) fields.experience = experience.slice(0, 8000);
  if (education) fields.education = education.slice(0, 4000);

  return fields;
}

function resolveCVPath(cvUrl) {
  if (!cvUrl || typeof cvUrl !== 'string') return null;

  let pathname;
  try {
    pathname = decodeURIComponent(cvUrl.split('?')[0]).replace(/\\/g, '/');
  } catch (_err) {
    throw new Error('Đường dẫn CV không hợp lệ.');
  }

  if (!pathname.startsWith('/uploads/cv/')) {
    throw new Error('Chỉ có thể đọc tệp trong thư mục CV.');
  }

  const filename = path.basename(pathname);
  const filePath = path.resolve(CV_DIRECTORY, filename);
  if (path.dirname(filePath) !== CV_DIRECTORY) {
    throw new Error('Đường dẫn CV không an toàn.');
  }
  return filePath;
}

async function extractCVText(cvUrl) {
  if (!cvUrl) return '';
  const extension = storedFileExtension(cvUrl);
  let buffer = await downloadStoredFile(cvUrl);
  let filePath = null;
  if (!buffer) {
    filePath = resolveCVPath(cvUrl);
    if (!filePath) return '';
    buffer = await fs.readFile(filePath);
  }
  let text = '';

  if (extension === '.pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy();
    }
  } else if (extension === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (extension === '.doc') {
    throw new Error('Tệp .doc cũ chưa thể đọc tự động. Vui lòng tải lại CV dạng PDF hoặc DOCX.');
  } else {
    throw new Error('AI chỉ hỗ trợ đọc CV dạng PDF hoặc DOCX.');
  }

  return cleanText(text).slice(0, MAX_AI_TEXT_LENGTH);
}

function buildProfileText(candidate) {
  return cleanText([
    candidate.full_name ? `Họ tên: ${candidate.full_name}` : '',
    candidate.skills ? `Kỹ năng: ${candidate.skills}` : '',
    candidate.experience ? `Kinh nghiệm: ${candidate.experience}` : '',
    candidate.education ? `Học vấn: ${candidate.education}` : ''
  ].filter(Boolean).join('\n'));
}

async function buildCandidateAIText(candidate, preferredCVUrl, options = {}) {
  const profileText = buildProfileText(candidate);
  const cvUrl = preferredCVUrl || candidate.cv_url;
  const includeProfileWithCV = options.includeProfileWithCV !== false;
  let cvText = '';
  let warning = null;

  if (cvUrl) {
    try {
      cvText = await extractCVText(cvUrl);
      if (!cvText) {
        warning = 'Không trích xuất được chữ từ CV; AI đang dùng thông tin hồ sơ.';
      } else if (isLikelyBlankCVTemplate(cvText)) {
        cvText = '';
        warning = 'CV hiện tại là mẫu chưa điền. Vui lòng tải lên CV có thông tin trước khi phân tích.';
      }
    } catch (err) {
      warning = err.code === 'ENOENT'
        ? 'Không tìm thấy tệp CV; AI đang dùng thông tin hồ sơ.'
        : err.message;
    }
  }

  const includedProfileText = !cvText || includeProfileWithCV ? profileText : '';
  const combined = cleanText([
    cvText ? `NỘI DUNG CV:\n${cvText}` : '',
    includedProfileText ? `THÔNG TIN HỒ SƠ:\n${includedProfileText}` : ''
  ].filter(Boolean).join('\n\n')).slice(0, MAX_AI_TEXT_LENGTH);

  return {
    text: combined,
    source: cvText ? (includedProfileText ? 'cv_and_profile' : 'cv') : 'profile',
    warning
  };
}

module.exports = {
  buildCandidateAIText,
  buildProfileText,
  extractCVText,
  extractProfileFields,
  isLikelyBlankCVTemplate
};
