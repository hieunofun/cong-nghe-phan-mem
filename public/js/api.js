// public/js/api.js
// Wrapper goi API chung: tu dong gan token, parse JSON, nem loi co message ro rang

const API_BASE = '/api';

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

  const res = await fetch(`${API_BASE}${path}`, {
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

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: formData });

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
  if (negotiable && !min && !max) return 'Thoa thuan';
  const fmt = (n) => (n >= 1000000 ? `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)} trieu` : n.toLocaleString('vi-VN'));
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `Tu ${fmt(min)}`;
  if (max) return `Toi ${fmt(max)}`;
  return 'Thoa thuan';
}

const JOB_TYPE_LABELS = {
  'full-time': 'Toan thoi gian',
  'part-time': 'Ban thoi gian',
  'internship': 'Thuc tap',
  'remote': 'Lam tu xa'
};

const STATUS_LABELS = {
  pending: 'Cho duyet', reviewing: 'Dang xem xet', interview: 'Phong van',
  accepted: 'Da nhan', rejected: 'Da tu choi',
  approved: 'Da duyet', active: 'Dang hoat dong', closed: 'Da dong',
  expired: 'Het han', banned: 'Bi khoa'
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vua xong';
  if (mins < 60) return `${mins} phut truoc`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} gio truoc`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngay truoc`;
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
