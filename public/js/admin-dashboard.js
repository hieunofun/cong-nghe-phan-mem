// public/js/admin-dashboard.js

requireAuth(['admin']);

const VIEW_META = {
  overview: { title: 'Tổng quan', subtitle: 'Tình trạng hoạt động chung của nền tảng JobLink.' },
  companies: { title: 'Duyệt doanh nghiệp', subtitle: 'Xét duyệt hồ sơ doanh nghiệp trước khi cho phép đăng tin.' },
  users: { title: 'Quản lý người dùng', subtitle: 'Quản lý trạng thái hoạt động của tất cả tài khoản.' },
  jobs: { title: 'Quản lý tin tuyển dụng', subtitle: 'Theo dõi và gỡ bỏ các tin tuyển dụng vi phạm nếu cần.' },
  categories: { title: 'Quản lý ngành nghề', subtitle: 'Thêm hoặc xoá các ngành nghề hiển thị trên nền tảng.' }
};

function switchView(view) {
  document.querySelectorAll('.dash-nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === view));
  document.querySelectorAll('.dash-view').forEach((el) => { el.style.display = el.id === `view-${view}` ? 'block' : 'none'; });
  document.getElementById('view-title').textContent = VIEW_META[view].title;
  document.getElementById('view-subtitle').textContent = VIEW_META[view].subtitle;

  if (view === 'companies') loadCompanies('pending');
  if (view === 'users') loadUsers('');
  if (view === 'jobs') loadJobs();
  if (view === 'categories') loadCategories();
}

document.querySelectorAll('.dash-nav a').forEach((a) => {
  a.addEventListener('click', (e) => { e.preventDefault(); switchView(a.dataset.view); });
});

// ---------- OVERVIEW ----------
async function loadStats() {
  try {
    const s = await apiFetch('/admin/stats');
    document.getElementById('stat-row').innerHTML = `
      <div class="stat-card"><div class="stat-value">${s.totalUsers}</div><div class="stat-label">Tổng tài khoản</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalCompanies}</div><div class="stat-label">Doanh nghiệp (${s.pendingCompanies} chờ duyệt)</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalCandidates}</div><div class="stat-label">Ứng viên</div></div>
      <div class="stat-card"><div class="stat-value">${s.activeJobs}</div><div class="stat-label">Tin đang tuyển / ${s.totalJobs} tổng</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalApplications}</div><div class="stat-label">Tổng lượt ứng tuyển</div></div>
    `;
  } catch (err) {
    showToast('Không tải được thống kê: ' + err.message, 'error');
  }
}

// ---------- COMPANIES ----------
document.querySelectorAll('#view-companies .tab-bar button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#view-companies .tab-bar button').forEach((b) => b.classList.toggle('active', b === btn));
    loadCompanies(btn.dataset.status);
  });
});

function companyRowHtml(c) {
  let actions = '';
  if (c.status === 'pending') {
    actions = `
      <button class="btn btn-primary btn-sm" onclick="approveCompany(${c.id})">Duyệt</button>
      <button class="btn btn-danger btn-sm" onclick="rejectCompany(${c.id})">Từ chối</button>
    `;
  } else if (c.status === 'rejected') {
    actions = `<button class="btn btn-primary btn-sm" onclick="approveCompany(${c.id})">Duyệt lại</button>`;
  } else {
    actions = `<button class="btn btn-danger btn-sm" onclick="rejectCompany(${c.id})">Thu hồi duyệt</button>`;
  }
  return `
    <tr>
      <td>${escapeHtml(c.company_name)}</td>
      <td>${escapeHtml(c.email)}</td>
      <td>${escapeHtml(c.address || '—')}</td>
      <td><span class="badge badge-${c.status}">${STATUS_LABELS[c.status] || c.status}</span></td>
      <td class="table-actions">${actions}</td>
    </tr>
  `;
}

async function loadCompanies(status) {
  const tbody = document.querySelector('#companies-table tbody');
  const emptyEl = document.getElementById('companies-empty');
  try {
    const query = status ? `?status=${status}` : '';
    const companies = await apiFetch(`/admin/companies${query}`);
    if (companies.length === 0) {
      document.getElementById('companies-table').style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }
    document.getElementById('companies-table').style.display = 'table';
    emptyEl.style.display = 'none';
    tbody.innerHTML = companies.map(companyRowHtml).join('');
  } catch (err) {
    showToast('Không tải được danh sách doanh nghiệp: ' + err.message, 'error');
  }
}

window.approveCompany = async function (id) {
  try {
    await apiFetch(`/admin/companies/${id}/approve`, { method: 'PUT' });
    showToast('Đã duyệt doanh nghiệp.', 'success');
    const activeTab = document.querySelector('#view-companies .tab-bar button.active');
    loadCompanies(activeTab.dataset.status);
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.rejectCompany = async function (id) {
  if (!confirm('Bạn có chắc muốn từ chối / thu hồi duyệt doanh nghiệp này?')) return;
  try {
    await apiFetch(`/admin/companies/${id}/reject`, { method: 'PUT' });
    showToast('Đã cập nhật trạng thái doanh nghiệp.', 'success');
    const activeTab = document.querySelector('#view-companies .tab-bar button.active');
    loadCompanies(activeTab.dataset.status);
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ---------- USERS ----------
document.querySelectorAll('#view-users .tab-bar button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#view-users .tab-bar button').forEach((b) => b.classList.toggle('active', b === btn));
    loadUsers(btn.dataset.role);
  });
});

const ROLE_LABELS = { admin: 'Quản trị viên', company: 'Doanh nghiệp', candidate: 'Ứng viên' };

function userRowHtml(u) {
  const isBanned = u.status === 'banned';
  return `
    <tr>
      <td>${escapeHtml(u.email)}</td>
      <td>${ROLE_LABELS[u.role] || u.role}</td>
      <td><span class="badge badge-${u.status}">${STATUS_LABELS[u.status] || u.status}</span></td>
      <td>${new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
      <td class="table-actions">
        ${u.role === 'admin' ? '' : `<button class="btn ${isBanned ? 'btn-primary' : 'btn-danger'} btn-sm" onclick="toggleUserBan(${u.id}, '${isBanned ? 'active' : 'banned'}')">${isBanned ? 'Mở khoá' : 'Khoá tài khoản'}</button>`}
      </td>
    </tr>
  `;
}

async function loadUsers(role) {
  const tbody = document.querySelector('#users-table tbody');
  try {
    const users = await apiFetch('/admin/users');
    const filtered = role ? users.filter((u) => u.role === role) : users;
    tbody.innerHTML = filtered.map(userRowHtml).join('') || `<tr><td colspan="5" style="color:var(--ink-faint);">Không có người dùng nào.</td></tr>`;
  } catch (err) {
    showToast('Không tải được danh sách người dùng: ' + err.message, 'error');
  }
}

window.toggleUserBan = async function (id, newStatus) {
  const msg = newStatus === 'banned' ? 'Bạn có chắc muốn khoá tài khoản này?' : 'Mở khoá tài khoản này?';
  if (!confirm(msg)) return;
  try {
    await apiFetch(`/admin/users/${id}/status`, { method: 'PUT', body: { status: newStatus } });
    showToast('Đã cập nhật trạng thái tài khoản.', 'success');
    const activeTab = document.querySelector('#view-users .tab-bar button.active');
    loadUsers(activeTab.dataset.role);
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ---------- JOBS ----------
function adminJobRowHtml(j) {
  return `
    <tr>
      <td><a href="/job-detail.html?id=${j.id}" target="_blank">${escapeHtml(j.title)}</a></td>
      <td>${escapeHtml(j.company_name)}</td>
      <td><span class="badge badge-${j.status}">${STATUS_LABELS[j.status] || j.status}</span></td>
      <td>${j.views}</td>
      <td class="table-actions"><button class="btn btn-danger btn-sm" onclick="deleteAnyJob(${j.id})">Xoá tin</button></td>
    </tr>
  `;
}

async function loadJobs() {
  const tbody = document.querySelector('#admin-jobs-table tbody');
  try {
    const jobs = await apiFetch('/admin/jobs');
    tbody.innerHTML = jobs.map(adminJobRowHtml).join('') || `<tr><td colspan="5" style="color:var(--ink-faint);">Chưa có tin tuyển dụng nào.</td></tr>`;
  } catch (err) {
    showToast('Không tải được danh sách tin: ' + err.message, 'error');
  }
}

window.deleteAnyJob = async function (id) {
  if (!confirm('Xoá tin tuyển dụng này? Toàn bộ hồ sơ ứng tuyển liên quan cũng sẽ bị xoá.')) return;
  try {
    await apiFetch(`/admin/jobs/${id}`, { method: 'DELETE' });
    showToast('Đã xoá tin tuyển dụng.', 'success');
    loadJobs();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ---------- CATEGORIES ----------
function categoryRowHtml(c) {
  return `
    <tr>
      <td>${escapeHtml(c.name)}</td>
      <td><code style="font-size:0.8rem; color:var(--ink-faint);">${escapeHtml(c.slug)}</code></td>
      <td class="table-actions"><button class="btn btn-danger btn-sm" onclick="deleteCategory(${c.id})">Xoá</button></td>
    </tr>
  `;
}

async function loadCategories() {
  const tbody = document.querySelector('#categories-table tbody');
  try {
    const categories = await apiFetch('/admin/categories');
    tbody.innerHTML = categories.map(categoryRowHtml).join('');
  } catch (err) {
    showToast('Không tải được danh sách ngành nghề: ' + err.message, 'error');
  }
}

document.getElementById('category-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('category-name');
  const name = input.value.trim();
  if (!name) return;
  try {
    await apiFetch('/admin/categories', { method: 'POST', body: { name } });
    input.value = '';
    showToast('Đã thêm ngành nghề mới!', 'success');
    loadCategories();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

window.deleteCategory = async function (id) {
  if (!confirm('Xoá ngành nghề này? Các tin tuyển dụng thuộc ngành này sẽ không còn được phân loại.')) return;
  try {
    await apiFetch(`/admin/categories/${id}`, { method: 'DELETE' });
    showToast('Đã xoá ngành nghề.', 'success');
    loadCategories();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

loadStats();

// ============================================================
// REVENUE TAB
// ============================================================

Object.assign(VIEW_META, {
  revenue: { title: 'Doanh thu', subtitle: 'Thống kê doanh thu và quản lý giao dịch thanh toán.' }
});

function fmtMoney(n) {
  return Number(n || 0).toLocaleString('vi-VN') + ' đ';
}

async function loadRevenue() {
  try {
    const stats = await apiFetch('/admin/revenue');

    document.getElementById('revenue-stat-row').innerHTML = `
      <div class="stat-card"><div class="stat-value" style="color:var(--success);">${fmtMoney(stats.totalRevenue)}</div><div class="stat-label">Tổng doanh thu</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--primary-dark);">${fmtMoney(stats.monthRevenue)}</div><div class="stat-label">Doanh thu tháng này</div></div>
      <div class="stat-card"><div class="stat-value">${stats.activeSubscriptions}</div><div class="stat-label">Gói đang hoạt động</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--warning);">${stats.pendingPayments}</div><div class="stat-label">Giao dịch chờ duyệt</div></div>
    `;

    // Doanh thu theo goi
    const byPkg = document.getElementById('revenue-by-package');
    if (stats.byPackage.length === 0) {
      byPkg.innerHTML = '<p class="form-hint">Chưa có giao dịch nào.</p>';
    } else {
      const maxRev = Math.max(...stats.byPackage.map(p => p.revenue));
      byPkg.innerHTML = stats.byPackage.map(p => `
        <div style="margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:5px;">
            <span style="font-weight:600;">${escapeHtml(p.name)}</span>
            <span style="font-family:var(--font-mono);">${fmtMoney(p.revenue)} (${p.count} đơn)</span>
          </div>
          <div style="background:var(--surface-alt); border-radius:100px; height:8px; overflow:hidden;">
            <div style="background:var(--primary); height:100%; border-radius:100px; width:${maxRev > 0 ? Math.round((p.revenue/maxRev)*100) : 0}%;"></div>
          </div>
        </div>
      `).join('');
    }

    // Doanh thu 6 thang
    const monthly = document.getElementById('revenue-monthly');
    if (stats.monthlyRevenue.length === 0) {
      monthly.innerHTML = '<p class="form-hint">Chưa có dữ liệu.</p>';
    } else {
      const maxM = Math.max(...stats.monthlyRevenue.map(m => m.revenue));
      monthly.innerHTML = stats.monthlyRevenue.map(m => `
        <div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:4px;">
            <span>${m.month}</span><span style="font-family:var(--font-mono);">${fmtMoney(m.revenue)}</span>
          </div>
          <div style="background:var(--surface-alt); border-radius:100px; height:7px; overflow:hidden;">
            <div style="background:var(--accent); height:100%; border-radius:100px; width:${maxM > 0 ? Math.round((m.revenue/maxM)*100) : 0}%;"></div>
          </div>
        </div>
      `).join('');
    }

    loadPayments('');
  } catch (err) {
    showToast('Không tải được dữ liệu doanh thu: ' + err.message, 'error');
  }
}

function paymentRowHtml(p) {
  const methodLabel = p.payment_method === 'demo' ? '⚡ Demo' : p.payment_method === 'bank_transfer' ? '🏦 Chuyển khoản' : '📱 MoMo';
  const statusBadge = p.status === 'completed' ? 'badge-accepted' : p.status === 'pending' ? 'badge-pending' : 'badge-rejected';
  const statusLabel = p.status === 'completed' ? 'Hoàn tất' : p.status === 'pending' ? 'Chờ duyệt' : 'Thất bại';
  const actions = p.status === 'pending'
    ? `<button class="btn btn-primary btn-sm" onclick="approvePayment(${p.id})">Xác nhận</button>
       <button class="btn btn-danger btn-sm" onclick="rejectPayment(${p.id})">Từ chối</button>`
    : '—';
  return `
    <tr>
      <td>${escapeHtml(p.company_name)}<br><span style="font-size:0.76rem; color:var(--ink-faint);">${escapeHtml(p.email)}</span></td>
      <td><strong>${escapeHtml(p.package_name)}</strong></td>
      <td style="font-family:var(--font-mono);">${fmtMoney(p.amount)}</td>
      <td>${methodLabel}</td>
      <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
      <td style="font-size:0.8rem; color:var(--ink-faint);">${new Date(p.created_at).toLocaleDateString('vi-VN')}</td>
      <td class="table-actions">${actions}</td>
    </tr>
  `;
}

async function loadPayments(status) {
  const tbody = document.querySelector('#payments-table tbody');
  try {
    const q = status ? `?status=${status}` : '';
    const payments = await apiFetch(`/admin/payments${q}`);
    tbody.innerHTML = payments.map(paymentRowHtml).join('') ||
      `<tr><td colspan="7" style="color:var(--ink-faint); text-align:center; padding:24px;">Không có giao dịch nào.</td></tr>`;
  } catch (err) {
    showToast('Không tải được giao dịch: ' + err.message, 'error');
  }
}

window.approvePayment = async function(id) {
  if (!confirm('Xác nhận thanh toán và kích hoạt gói cho doanh nghiệp này?')) return;
  try {
    const data = await apiFetch(`/admin/payments/${id}/approve`, { method: 'PUT' });
    showToast(data.message, 'success');
    loadRevenue();
  } catch (err) { showToast(err.message, 'error'); }
};

window.rejectPayment = async function(id) {
  if (!confirm('Từ chối giao dịch này?')) return;
  try {
    await apiFetch(`/admin/payments/${id}/reject`, { method: 'PUT' });
    showToast('Đã từ chối giao dịch.', 'success');
    loadRevenue();
  } catch (err) { showToast(err.message, 'error'); }
};

document.getElementById('payment-tab-bar')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelectorAll('#payment-tab-bar button').forEach(b => b.classList.toggle('active', b === btn));
  loadPayments(btn.dataset.status);
});

// Patch switchView to handle revenue tab
const _adminOrigSwitch = switchView;
window.switchView = function(view) {
  _adminOrigSwitch(view);
  if (view === 'revenue') loadRevenue();
};
document.querySelectorAll('.dash-nav a[data-view]').forEach(a => {
  a.onclick = (e) => { e.preventDefault(); window.switchView(a.dataset.view); };
});
