// public/js/api.js
// Wrapper goi API chung: tu dong gan token, parse JSON, nem loi co message ro rang

const API_ORIGIN = (window.JOBLINK_API_BASE_URL || '').trim().replace(/\/$/, '');
const API_BASE = `${API_ORIGIN}/api`;
window.JOBLINK_API_BASE = API_BASE;

function dashboardUrlForRole(role) {
  if (role === 'admin') return '/admin-dashboard.html';
  if (role === 'company') return '/company-dashboard.html';
  return '/candidate-dashboard.html';
}

function apiEndpoint(path) {
  return `${API_BASE}${path}`;
}

function getToken() {
  return localStorage.getItem('joblink_token') || sessionStorage.getItem('joblink_token');
}

function getUser() {
  const raw = localStorage.getItem('joblink_user') || sessionStorage.getItem('joblink_user');
  return raw ? JSON.parse(raw) : null;
}

function setAuth(token, user, remember = true) {
  clearAuth();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('joblink_token', token);
  storage.setItem('joblink_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('joblink_token');
  localStorage.removeItem('joblink_user');
  sessionStorage.removeItem('joblink_token');
  sessionStorage.removeItem('joblink_user');
}

function isLoggedIn() {
  return !!getToken();
}

// Goi API voi JSON body. method: GET/POST/PUT/DELETE
async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers['Authorization'] = `Bearer ${getToken()}`;

  const res = await fetch(apiEndpoint(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let data = null;
  try { data = await res.json(); } catch (e) { /* response khong co body JSON */ }

  if (!res.ok) {
    const message = (data && data.message) || `Loi ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

// Goi API voi FormData (dung khi upload file)
async function apiUpload(path, formData, method = 'POST') {
  const headers = {};
  if (getToken()) headers['Authorization'] = `Bearer ${getToken()}`;

  const res = await fetch(apiEndpoint(path), { method, headers, body: formData });

  let data = null;
  try { data = await res.json(); } catch (e) { /* khong co body JSON */ }

  if (!res.ok) {
    const message = (data && data.message) || `Loi ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

function formatSalary(min, max, negotiable) {
  if (negotiable && !min && !max) return 'Thỏa thuận';
  const fmt = (n) => (n >= 1000000 ? `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)} triệu` : n.toLocaleString('vi-VN'));
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `Từ ${fmt(min)}`;
  if (max) return `Tới ${fmt(max)}`;
  return 'Thỏa thuận';
}

const JOB_TYPE_LABELS = {
  'full-time': 'Toàn thời gian',
  'part-time': 'Bán thời gian',
  'internship': 'Thực tập',
  'remote': 'Làm từ xa'
};

const STATUS_LABELS = {
  pending: 'Chờ duyệt', reviewing: 'Đang xem xét', interview: 'Phỏng vấn',
  accepted: 'Đã nhận', rejected: 'Đã từ chối',
  approved: 'Đã duyệt', active: 'Đang hoạt động', closed: 'Đã đóng',
  expired: 'Hết hạn', banned: 'Bị khóa'
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function showToast(message, type = 'info') {
  let host = document.querySelector('.toast-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  host.appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
