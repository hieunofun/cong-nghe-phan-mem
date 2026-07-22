// public/js/header.js
// Dung chung cho moi trang: render phan auth tren navbar + mobile menu toggle + bao ve route dashboard

const ROLE_NAV_ITEMS = {
  candidate: [
    { href: '/candidate-dashboard.html', label: 'Trang quản lý' },
    { href: '/index.html', label: 'Trang chủ' },
    { href: '/jobs.html', label: 'Tìm việc' },
    { href: '/candidate-dashboard.html?view=saved', label: 'Tìm & lưu việc' },
    { href: '/support.html', label: 'Hỗ trợ' }
  ],
  company: [
    { href: '/company-dashboard.html', label: 'Trang quản lý' },
    { href: '/index.html', label: 'Trang chủ' },
    { href: '/employers.html', label: 'Giải pháp tuyển dụng' },
    { href: '/packages.html', label: 'Bảng giá' },
    { href: '/support.html', label: 'Hỗ trợ' }
  ],
  admin: [
    { href: '/admin-dashboard.html?view=overview', label: 'Tổng quan' },
    { href: '/admin-dashboard.html?view=companies', label: 'Doanh nghiệp' },
    { href: '/admin-dashboard.html?view=users', label: 'Người dùng' },
    { href: '/admin-dashboard.html?view=jobs', label: 'Tin tuyển dụng' },
    { href: '/admin-dashboard.html?view=revenue', label: 'Doanh thu' }
  ]
};

const DEFAULT_ROLE_VIEWS = {
  candidate: 'profile',
  company: 'overview',
  admin: 'overview'
};

function renderRoleNav() {
  const nav = document.querySelector('.nav-links');
  if (!nav) return;

  const user = getToken() ? getUser() : null;
  const isDashboard = Boolean(document.querySelector('.dashboard-shell'));
  if (isDashboard && user?.role === 'admin') {
    nav.innerHTML = '';
    nav.classList.add('dashboard-nav-hidden');
    document.querySelector('.nav-toggle')?.classList.add('dashboard-nav-toggle-hidden');
    return;
  }

  const items = user ? ROLE_NAV_ITEMS[user.role] : null;
  if (!items) return;

  nav.classList.add('role-nav');
  nav.innerHTML = items.map((item) => `<a href="${item.href}">${item.label}</a>`).join('');
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

function openAccountSwitchDialog(targetUrl, trigger) {
  if (document.querySelector('[data-account-switch-dialog]')) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.dataset.accountSwitchDialog = '';
  overlay.innerHTML = `
    <div class="modal-box account-switch-dialog" role="dialog" aria-modal="true" aria-labelledby="account-switch-title" aria-describedby="account-switch-message">
      <div class="modal-head">
        <h3 id="account-switch-title">Đổi tài khoản?</h3>
        <button type="button" class="modal-close" data-switch-cancel aria-label="Đóng">&times;</button>
      </div>
      <p id="account-switch-message">Bạn đang đăng nhập. Tiếp tục sẽ đăng xuất tài khoản hiện tại.</p>
      <div class="account-switch-actions">
        <button type="button" class="btn btn-outline" data-switch-cancel>Hủy</button>
        <button type="button" class="btn btn-primary" data-switch-confirm>Đăng xuất và tiếp tục</button>
      </div>
    </div>
  `;

  function closeDialog() {
    document.removeEventListener('keydown', handleKeydown);
    overlay.remove();
    trigger?.focus();
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') closeDialog();
  }

  overlay.querySelectorAll('[data-switch-cancel]').forEach((button) => {
    button.addEventListener('click', closeDialog);
  });
  overlay.querySelector('[data-switch-confirm]').addEventListener('click', (event) => {
    event.currentTarget.disabled = true;
    clearAuth();
    window.location.assign(targetUrl);
  });
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeDialog();
  });
  document.addEventListener('keydown', handleKeydown);
  document.body.appendChild(overlay);
  overlay.querySelector('[data-switch-cancel]').focus();
}

function initAccountSwitchConfirmation() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link || !getToken() || !getUser()) return;

    const targetUrl = new URL(link.href, window.location.href);
    const isAccountEntry = targetUrl.origin === window.location.origin
      && ['/login.html', '/register.html'].includes(targetUrl.pathname);
    if (!isAccountEntry) return;

    event.preventDefault();
    openAccountSwitchDialog(targetUrl.href, link);
  });
}

function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const inner = document.querySelector('.navbar-inner');
  if (!toggle || !inner) return;
  toggle.addEventListener('click', () => inner.classList.toggle('menu-open'));
}

function markActiveNav() {
  const currentUrl = new URL(window.location.href);
  const user = getToken() ? getUser() : null;
  const explicitView = currentUrl.searchParams.get('view');
  const currentView = currentUrl.searchParams.get('view') || DEFAULT_ROLE_VIEWS[user?.role] || '';

  document.querySelectorAll('.nav-links a').forEach((link) => {
    const linkUrl = new URL(link.getAttribute('href'), currentUrl.origin);
    const linkView = linkUrl.searchParams.get('view');
    const active = linkUrl.pathname === currentUrl.pathname
      && (linkView ? linkView === currentView : !explicitView);
    link.classList.toggle('active', active);
  });
}

function syncDashboardView(view) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', view);
  window.history.replaceState(window.history.state, '', url);
  markActiveNav();
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
  renderRoleNav();
  renderNavAuth();
  initAccountSwitchConfirmation();
  initMobileNav();
  markActiveNav();
});
