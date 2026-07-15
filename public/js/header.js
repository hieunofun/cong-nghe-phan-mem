// public/js/header.js
// Dung chung cho moi trang: render phan auth tren navbar + mobile menu toggle + bao ve route dashboard

function dashboardUrlForRole(role) {
  if (role === 'admin') return '/admin-dashboard.html';
  if (role === 'company') return '/company-dashboard.html';
  return '/candidate-dashboard.html';
}

function renderNavAuth() {
  const slot = document.getElementById('nav-auth-slot');
  if (!slot) return;

  const user = getUser();
  if (!user) {
    slot.innerHTML = `
      <a href="/login.html" class="btn btn-ghost btn-sm">Đăng nhập</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Đăng ký</a>
    `;
    return;
  }

  const initial = (user.email || '?')[0].toUpperCase();
  const roleLabel = user.role === 'admin' ? 'Quản trị viên' : user.role === 'company' ? 'Doanh nghiệp' : 'Ứng viên';

  slot.innerHTML = `
    <a href="${dashboardUrlForRole(user.role)}" class="btn btn-outline btn-sm">
      <span style="width:22px;height:22px;border-radius:50%;background:var(--primary-light);color:var(--primary-dark);display:inline-flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;">${escapeHtml(initial)}</span>
      ${escapeHtml(roleLabel)}
    </a>
    <button class="btn btn-ghost btn-sm" id="logout-btn">Đăng xuất</button>
  `;

  document.getElementById('logout-btn').addEventListener('click', () => {
    clearAuth();
    showToast('Đã đăng xuất.', 'success');
    setTimeout(() => { window.location.href = '/index.html'; }, 500);
  });
}

function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const inner = document.querySelector('.navbar-inner');
  if (!toggle || !inner) return;
  toggle.addEventListener('click', () => inner.classList.toggle('menu-open'));
}

function markActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const href = link.getAttribute('href').replace('/', '');
    if (href === path) link.classList.add('active');
  });
}

// Goi tren cac trang dashboard de bat buoc dang nhap dung vai tro, neu khong se chuyen ve trang login
function requireAuth(allowedRoles) {
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = '/login.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    window.location.href = dashboardUrlForRole(user.role);
    return null;
  }
  return user;
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavAuth();
  initMobileNav();
  markActiveNav();
});
