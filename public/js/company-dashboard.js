// public/js/company-dashboard.js

const user = requireAuth(['company']);

let companyProfile = null;
let myJobs = [];
let currentSub = null;

const VIEW_META = {
  overview: { title: 'Tổng quan', subtitle: 'Tình hình tuyển dụng của doanh nghiệp bạn.' },
  jobs: { title: 'Tin đã đăng', subtitle: 'Quản lý các tin tuyển dụng của doanh nghiệp.' },
  applicants: { title: 'Quản lý ứng viên', subtitle: 'Theo dõi và xử lý hồ sơ ứng tuyển theo từng vị trí.' },
  profile: { title: 'Hồ sơ công ty', subtitle: 'Thông tin này sẽ hiển thị công khai trên tin tuyển dụng.' }
};

function switchView(view) {
  document.querySelectorAll('.dash-nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === view));
  document.querySelectorAll('.dash-view').forEach((el) => { el.style.display = el.id === `view-${view}` ? 'block' : 'none'; });
  document.getElementById('view-title').textContent = VIEW_META[view].title;
  document.getElementById('view-subtitle').textContent = VIEW_META[view].subtitle;
  renderHeaderAction(view);
}

document.querySelectorAll('.dash-nav a').forEach((a) => {
  a.addEventListener('click', (e) => { e.preventDefault(); switchView(a.dataset.view); });
});

function renderHeaderAction(view) {
  const el = document.getElementById('header-action');
  if (view === 'jobs' && companyProfile && companyProfile.status === 'approved') {
    el.innerHTML = `<button class="btn btn-accent" id="new-job-btn">+ Đăng tin mới</button>`;
    document.getElementById('new-job-btn').addEventListener('click', () => openJobModal(null));
  } else {
    el.innerHTML = '';
  }
}

// ---------- PROFILE ----------
function fillProfile(profile) {
  companyProfile = profile;
  document.getElementById('sidebar-name').textContent = profile.company_name;
  document.getElementById('sidebar-avatar').innerHTML = profile.logo_url
    ? `<img src="${profile.logo_url}" alt="logo">` : profile.company_name.slice(0, 2).toUpperCase();
  document.getElementById('sidebar-status').innerHTML = `${STATUS_LABELS[profile.status] || profile.status}`;
  document.getElementById('logo-preview').innerHTML = profile.logo_url
    ? `<img src="${profile.logo_url}" alt="logo">` : 'Logo';

  document.getElementById('company_name').value = profile.company_name || '';
  document.getElementById('tax_code').value = profile.tax_code || '';
  document.getElementById('scale').value = profile.scale || '';
  document.getElementById('website').value = profile.website || '';
  document.getElementById('address').value = profile.address || '';
  document.getElementById('description').value = profile.description || '';

  renderApprovalBanner(profile.status);
}

function renderApprovalBanner(status) {
  const el = document.getElementById('approval-banner');
  if (status === 'pending') {
    el.innerHTML = `<div class="alert alert-info">Hồ sơ doanh nghiệp của bạn đang chờ Admin duyệt. Bạn sẽ có thể đăng tin tuyển dụng sau khi được duyệt.</div>`;
  } else if (status === 'rejected') {
    el.innerHTML = `<div class="alert alert-error">Hồ sơ doanh nghiệp của bạn đã bị từ chối. Vui lòng cập nhật thông tin hồ sơ hoặc liên hệ Admin để biết thêm chi tiết.</div>`;
  } else {
    el.innerHTML = '';
  }
}

async function loadProfile() {
  try {
    const profile = await apiFetch('/companies/me/profile');
    fillProfile(profile);
  } catch (err) {
    showToast('Không tải được hồ sơ công ty: ' + err.message, 'error');
  }
}

document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('profile-submit-btn');
  const alertSlot = document.getElementById('profile-alert-slot');
  alertSlot.innerHTML = '';
  btn.disabled = true;
  btn.innerHTML = `<span class="loading-spinner"></span> Đang lưu...`;

  try {
    const body = {
      company_name: document.getElementById('company_name').value.trim(),
      tax_code: document.getElementById('tax_code').value.trim(),
      scale: document.getElementById('scale').value.trim(),
      website: document.getElementById('website').value.trim(),
      address: document.getElementById('address').value.trim(),
      description: document.getElementById('description').value.trim()
    };
    const data = await apiFetch('/companies/me/profile', { method: 'PUT', body });
    fillProfile(data.profile);
    showToast('Đã lưu hồ sơ công ty!', 'success');
  } catch (err) {
    alertSlot.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Lưu thay đổi';
  }
});

document.getElementById('logo-upload-btn').addEventListener('click', () => document.getElementById('logo-input').click());
document.getElementById('logo-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const formData = new FormData();
    formData.append('logo', file);
    const data = await apiUpload('/companies/me/logo', formData);
    document.getElementById('logo-preview').innerHTML = `<img src="${data.logo_url}" alt="logo">`;
    document.getElementById('sidebar-avatar').innerHTML = `<img src="${data.logo_url}" alt="logo">`;
    showToast('Đã cập nhật logo!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ---------- OVERVIEW ----------
async function loadOverview() {
  const totalJobs = myJobs.length;
  const activeJobs = myJobs.filter((j) => j.status === 'active').length;
  const totalApplicants = myJobs.reduce((sum, j) => sum + Number(j.application_count || 0), 0);

  let pendingCount = 0;
  try {
    const stats = await apiFetch('/applications/stats');
    pendingCount = (stats.find((s) => s.status === 'pending') || {}).count || 0;
  } catch (e) { /* khong chan render neu loi */ }

  document.getElementById('stat-row').innerHTML = `
    <div class="stat-card"><div class="stat-value">${totalJobs}</div><div class="stat-label">Tổng số tin đã đăng</div></div>
    <div class="stat-card"><div class="stat-value">${activeJobs}</div><div class="stat-label">Tin đang tuyển</div></div>
    <div class="stat-card"><div class="stat-value">${totalApplicants}</div><div class="stat-label">Tổng số ứng viên</div></div>
    <div class="stat-card"><div class="stat-value">${pendingCount}</div><div class="stat-label">Ứng viên chờ xét</div></div>
  `;

  const tbody = document.querySelector('#recent-jobs-table tbody');
  tbody.innerHTML = myJobs.slice(0, 5).map((j) => `
    <tr>
      <td><a href="/job-detail.html?id=${j.id}">${escapeHtml(j.title)}</a></td>
      <td><span class="badge badge-${j.status}">${STATUS_LABELS[j.status] || j.status}</span></td>
      <td>${j.application_count || 0}</td>
    </tr>
  `).join('') || `<tr><td colspan="3" style="color:var(--ink-faint);">Chưa có tin tuyển dụng nào.</td></tr>`;
}

// ---------- JOBS TABLE ----------
function jobRowHtml(job) {
  return `
    <tr>
      <td>${escapeHtml(job.title)}</td>
      <td>${JOB_TYPE_LABELS[job.job_type] || job.job_type}</td>
      <td><span class="badge badge-${job.status}">${STATUS_LABELS[job.status] || job.status}</span></td>
      <td>${job.views}</td>
      <td>${job.application_count || 0}</td>
      <td class="table-actions">
        <button class="btn btn-ghost btn-sm" onclick="editJob(${job.id})">Sửa</button>
        <button class="btn btn-outline btn-sm" onclick="toggleJobStatus(${job.id}, '${job.status}')">${job.status === 'active' ? 'Đóng tin' : 'Mở lại'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteJob(${job.id})">Xoá</button>
      </td>
    </tr>
  `;
}

function renderJobsTable() {
  const tbody = document.querySelector('#jobs-table tbody');
  const emptyEl = document.getElementById('jobs-empty');
  if (myJobs.length === 0) {
    document.getElementById('jobs-table').style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }
  document.getElementById('jobs-table').style.display = 'table';
  emptyEl.style.display = 'none';
  tbody.innerHTML = myJobs.map(jobRowHtml).join('');
}

async function loadJobs() {
  try {
    myJobs = await apiFetch('/jobs/company/my-jobs');
    renderJobsTable();
    loadOverview();
    populateJobSelect();
  } catch (err) {
    showToast('Không tải được danh sách tin: ' + err.message, 'error');
  }
}

window.toggleJobStatus = async function (jobId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'closed' : 'active';
  try {
    await apiFetch(`/jobs/${jobId}`, { method: 'PUT', body: { status: newStatus } });
    showToast(newStatus === 'closed' ? 'Đã đóng tin tuyển dụng.' : 'Đã mở lại tin tuyển dụng.', 'success');
    loadJobs();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deleteJob = async function (jobId) {
  if (!confirm('Bạn có chắc muốn xoá tin tuyển dụng này? Hành động này không thể hoàn tác.')) return;
  try {
    await apiFetch(`/jobs/${jobId}`, { method: 'DELETE' });
    showToast('Đã xoá tin tuyển dụng.', 'success');
    loadJobs();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.editJob = function (jobId) {
  const job = myJobs.find((j) => j.id === jobId);
  if (job) openJobModal(job);
};

// ---------- JOB CREATE/EDIT MODAL ----------
let categoriesCache = [];
async function getCategories() {
  if (categoriesCache.length) return categoriesCache;
  categoriesCache = await apiFetch('/categories', { auth: false });
  return categoriesCache;
}

async function openJobModal(job) {
  const categories = await getCategories();
  const sub = currentSub;
  const isEdit = !!job;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:640px;">
      <div class="modal-head">
        <h3 class="mb-0">${isEdit ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng mới'}</h3>
        <button class="modal-close" id="job-modal-close">&times;</button>
      </div>
      <div id="job-modal-alert"></div>
      <form id="job-form">
        <div class="form-group">
          <label>Tiêu đề công việc *</label>
          <input type="text" id="jf-title" class="input" required value="${escapeHtml(job?.title || '')}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Ngành nghề</label>
            <select id="jf-category" class="input">
              <option value="">-- Chọn ngành nghề --</option>
              ${categories.map((c) => `<option value="${c.id}" ${job?.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Loại công việc</label>
            <select id="jf-job-type" class="input">
              ${['full-time', 'part-time', 'internship', 'remote'].map((t) => `<option value="${t}" ${job?.job_type === t ? 'selected' : ''}>${JOB_TYPE_LABELS[t]}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Mô tả công việc *</label>
          <textarea id="jf-description" class="input" required>${escapeHtml(job?.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Yêu cầu ứng viên</label>
          <textarea id="jf-requirements" class="input">${escapeHtml(job?.requirements || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Quyền lợi</label>
          <textarea id="jf-benefits" class="input">${escapeHtml(job?.benefits || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Lương tối thiểu (VNĐ)</label>
            <input type="number" id="jf-salary-min" class="input" value="${job?.salary_min || ''}">
          </div>
          <div class="form-group">
            <label>Lương tối đa (VNĐ)</label>
            <input type="number" id="jf-salary-max" class="input" value="${job?.salary_max || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Địa điểm làm việc</label>
            <input type="text" id="jf-location" class="input" value="${escapeHtml(job?.location || '')}">
          </div>
          <div class="form-group">
            <label>Số lượng cần tuyển</label>
            <input type="number" id="jf-vacancies" class="input" min="1" value="${job?.vacancies || 1}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Kinh nghiệm yêu cầu</label>
            <input type="text" id="jf-experience" class="input" value="${escapeHtml(job?.experience_level || '')}">
          </div>
          <div class="form-group">
            <label>Hạn nộp hồ sơ</label>
            <input type="date" id="jf-deadline" class="input" value="${job?.deadline || ''}">
          </div>
        </div>
      ${sub && sub.max_vip_posts > 0 ? `
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:0.9rem;">
            <input type="checkbox" id="jf-vip" ${job?.is_vip ? 'checked' : ''}>
            <span>⭐ Đăng tin <strong>VIP</strong> – nổi bật trên đầu kết quả (còn ${sub.max_vip_posts - sub.vip_posts_used} lượt)</span>
          </label>
        </div>` : ''}
      <button type="submit" class="btn btn-primary btn-block" id="job-submit-btn">${isEdit ? 'Lưu thay đổi' : 'Đăng tin'}</button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('job-modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('job-submit-btn');
    const alertSlot = document.getElementById('job-modal-alert');
    alertSlot.innerHTML = '';
    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span> Đang xử lý...`;

    const body = {
      title: document.getElementById('jf-title').value.trim(),
      category_id: document.getElementById('jf-category').value || null,
      job_type: document.getElementById('jf-job-type').value,
      description: document.getElementById('jf-description').value.trim(),
      requirements: document.getElementById('jf-requirements').value.trim(),
      benefits: document.getElementById('jf-benefits').value.trim(),
      salary_min: document.getElementById('jf-salary-min').value || null,
      salary_max: document.getElementById('jf-salary-max').value || null,
      location: document.getElementById('jf-location').value.trim(),
      vacancies: document.getElementById('jf-vacancies').value || 1,
      experience_level: document.getElementById('jf-experience').value.trim(),
      deadline: document.getElementById('jf-deadline').value || null,
      is_vip: document.getElementById('jf-vip') ? document.getElementById('jf-vip').checked : false
    };

    try {
      if (isEdit) {
        await apiFetch(`/jobs/${job.id}`, { method: 'PUT', body });
        showToast('Đã cập nhật tin tuyển dụng!', 'success');
      } else {
        await apiFetch('/jobs', { method: 'POST', body });
        showToast('Đã đăng tin tuyển dụng mới!', 'success');
      }
      overlay.remove();
      loadJobs();
    } catch (err) {
      alertSlot.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
      btn.disabled = false;
      btn.textContent = isEdit ? 'Lưu thay đổi' : 'Đăng tin';
    }
  });
}

// ---------- APPLICANTS PIPELINE ----------
function populateJobSelect() {
  const select = document.getElementById('job-select');
  if (myJobs.length === 0) {
    select.innerHTML = `<option>Chưa có tin tuyển dụng</option>`;
    document.getElementById('pipeline').innerHTML = '';
    return;
  }
  select.innerHTML = myJobs.map((j) => `<option value="${j.id}">${escapeHtml(j.title)} (${j.application_count || 0} ứng viên)</option>`).join('');
  select.onchange = () => loadApplicants(select.value);
  loadApplicants(select.value);
}

const PIPELINE_STAGES = [
  { key: 'pending', label: 'Mới ứng tuyển' },
  { key: 'reviewing', label: 'Đang xem xét' },
  { key: 'interview', label: 'Phỏng vấn' },
  { key: 'accepted', label: 'Đã nhận' },
  { key: 'rejected', label: 'Đã từ chối' }
];

function applicantCardHtml(app) {
  return `
    <div class="applicant-card">
      <div class="ac-name">${escapeHtml(app.full_name)}</div>
      <div class="ac-meta">${escapeHtml(app.phone || 'Chưa có SĐT')}</div>
      ${app.skills ? `<div class="ac-meta">${escapeHtml(app.skills.slice(0, 60))}${app.skills.length > 60 ? '...' : ''}</div>` : ''}
      ${app.cv_url ? `<a href="${app.cv_url}" target="_blank" class="btn btn-ghost btn-sm" style="padding:4px 10px; font-size:0.75rem;">Xem CV</a>` : ''}
      <select onchange="updateApplicationStatus(${app.id}, this.value)">
        ${PIPELINE_STAGES.map((s) => `<option value="${s.key}" ${app.status === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}
      </select>
    </div>
  `;
}

async function loadApplicants(jobId) {
  if (!jobId) return;
  const pipelineEl = document.getElementById('pipeline');
  const emptyEl = document.getElementById('applicants-empty');
  try {
    const apps = await apiFetch(`/applications/job/${jobId}`);
    if (apps.length === 0) {
      pipelineEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';
    pipelineEl.innerHTML = PIPELINE_STAGES.map((stage) => {
      const stageApps = apps.filter((a) => a.status === stage.key);
      return `
        <div class="pipeline-col">
          <h4>${stage.label} (${stageApps.length})</h4>
          ${stageApps.map(applicantCardHtml).join('') || '<p style="font-size:0.8rem; color:var(--ink-faint);">Không có</p>'}
        </div>
      `;
    }).join('');
  } catch (err) {
    showToast('Không tải được danh sách ứng viên: ' + err.message, 'error');
  }
}

window.updateApplicationStatus = async function (appId, status) {
  try {
    await apiFetch(`/applications/${appId}/status`, { method: 'PUT', body: { status } });
    showToast('Đã cập nhật trạng thái ứng viên.', 'success');
    const jobId = document.getElementById('job-select').value;
    loadApplicants(jobId);
    loadJobs();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

async function init() {
  await loadProfile();
  await loadJobs();
  try { currentSub = await apiFetch('/payments/subscription'); } catch(e) { currentSub = null; }
  renderHeaderAction('overview');
}

init();

// ============================================================
// SUBSCRIPTION TAB
// ============================================================

Object.assign(VIEW_META, {
  subscription: { title: 'Gói dịch vụ', subtitle: 'Quản lý gói dịch vụ và lịch sử thanh toán của doanh nghiệp.' }
});

const PKG_COLORS = { free: 'badge-pending', basic: 'badge-info', pro: 'badge-accepted', enterprise: 'badge-interview' };

async function loadSubscription() {
  const el = document.getElementById('sub-content');
  try {
    const [sub, payments] = await Promise.all([
      apiFetch('/payments/subscription'),
      apiFetch('/payments/my')
    ]);

    const quotaPct = sub && sub.max_job_posts < 999
      ? Math.min(100, Math.round((sub.job_posts_used / sub.max_job_posts) * 100)) : 5;

    el.innerHTML = `
      <!-- Goi hien tai -->
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap;">
          <div>
            <div style="font-size:0.8rem; color:var(--ink-faint); text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px;">Gói hiện tại</div>
            ${sub
              ? `<div style="font-size:1.4rem; font-weight:800; font-family:var(--font-display); color:var(--primary-dark);">${escapeHtml(sub.package_name)}</div>
                 <div style="font-size:0.85rem; color:var(--ink-soft); margin-top:4px;">Hết hạn: ${new Date(sub.expires_at).toLocaleDateString('vi-VN')}</div>`
              : `<div style="font-size:1.4rem; font-weight:800; font-family:var(--font-display); color:var(--ink-soft);">Miễn phí</div>
                 <div style="font-size:0.85rem; color:var(--ink-soft); margin-top:4px;">Tối đa 3 tin đăng đang hoạt động</div>`
            }
          </div>
          <a href="/packages.html" class="btn btn-primary">
            ${sub ? '⬆️ Nâng cấp gói' : '💎 Mua gói ngay'}
          </a>
        </div>

        ${sub ? `
        <div style="margin-top:20px; display:grid; grid-template-columns:repeat(3,1fr); gap:14px;">
          <div>
            <div style="font-size:0.78rem; color:var(--ink-faint); margin-bottom:6px;">Tin đăng đã dùng</div>
            <div style="background:var(--surface-alt); border-radius:100px; height:8px; overflow:hidden; margin-bottom:4px;">
              <div style="background:var(--primary); height:100%; border-radius:100px; width:${quotaPct}%;"></div>
            </div>
            <div style="font-family:var(--font-mono); font-size:0.82rem;">${sub.job_posts_used} / ${sub.max_job_posts >= 999 ? '∞' : sub.max_job_posts}</div>
          </div>
          <div>
            <div style="font-size:0.78rem; color:var(--ink-faint); margin-bottom:6px;">Tin VIP đã dùng</div>
            <div style="font-family:var(--font-mono); font-size:1rem; font-weight:700; color:var(--accent-dark);">${sub.vip_posts_used} / ${sub.max_vip_posts >= 999 ? '∞' : sub.max_vip_posts}</div>
          </div>
          <div>
            <div style="font-size:0.78rem; color:var(--ink-faint); margin-bottom:6px;">CV đã xem</div>
            <div style="font-family:var(--font-mono); font-size:1rem; font-weight:700; color:var(--info);">${sub.cv_views_used} / ${sub.max_cv_views >= 999 ? '∞' : sub.max_cv_views}</div>
          </div>
        </div>` : ''}
      </div>

      <!-- Lich su giao dich -->
      <div class="card">
        <h3 style="font-size:0.95rem; margin-bottom:14px;">Lịch sử giao dịch</h3>
        ${payments.length === 0
          ? `<div class="empty-state" style="padding:24px 0;"><div class="empty-icon">📄</div><p>Chưa có giao dịch nào.</p></div>`
          : `<div class="table-wrap">
               <table>
                 <thead><tr><th>Gói</th><th>Số tiền</th><th>Phương thức</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
                 <tbody>
                   ${payments.map(p => `
                     <tr>
                       <td><strong>${escapeHtml(p.package_name)}</strong></td>
                       <td style="font-family:var(--font-mono);">${Number(p.amount).toLocaleString('vi-VN')} đ</td>
                       <td>${p.payment_method === 'demo' ? '⚡ Demo' : p.payment_method === 'bank_transfer' ? '🏦 Chuyển khoản' : '📱 MoMo'}</td>
                       <td><span class="badge badge-${p.status === 'completed' ? 'accepted' : p.status === 'pending' ? 'pending' : 'rejected'}">${p.status === 'completed' ? 'Hoàn tất' : p.status === 'pending' ? 'Chờ duyệt' : 'Thất bại'}</span></td>
                       <td style="font-size:0.82rem; color:var(--ink-faint);">${new Date(p.created_at).toLocaleDateString('vi-VN')}</td>
                     </tr>
                   `).join('')}
                 </tbody>
               </table>
             </div>`
        }
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">Không tải được thông tin gói: ${escapeHtml(err.message)}</div>`;
  }
}

// Ghi de switchView de bao gom subscription
const _origSwitch = switchView;
window.switchView = function(view) {
  _origSwitch(view);
  if (view === 'subscription') loadSubscription();
};

// Overwrite nav listeners to use the new switchView
document.querySelectorAll('.dash-nav a[data-view]').forEach((a) => {
  a.onclick = (e) => { e.preventDefault(); window.switchView(a.dataset.view); };
});

// ── AI PHAN TICH UNG VIEN ─────────────────────────────────────
window.analyzeCandidate = async function(candidateId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:520px;">
      <div class="modal-head">
        <h3 class="mb-0">🤖 AI Phân tích ứng viên</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div id="ai-analyze-result" style="text-align:center; padding:32px;">
        <span class="loading-spinner" style="width:28px;height:28px;border-color:rgba(0,0,0,.15);border-top-color:var(--primary);"></span>
        <p style="margin-top:12px; color:var(--ink-faint);">Đang phân tích hồ sơ...</p>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });

  try {
    const data = await apiFetch('/ai/analyze-cv/' + candidateId);
    const EXP_LABEL = { fresher:'Fresher (Mới ra trường)', junior:'Junior (1-2 năm)', middle:'Middle (3-5 năm)', senior:'Senior (5+ năm)' };
    document.getElementById('ai-analyze-result').innerHTML = `
      <div style="text-align:left;">
        <div style="background:var(--primary-light); border-radius:var(--radius-sm); padding:12px; margin-bottom:16px;">
          <strong>${escapeHtml(data.candidate_name || 'Ứng viên')}</strong><br>
          <span style="font-size:0.85rem; color:var(--primary-dark);">${escapeHtml(data.summary)}</span>
        </div>
        <div style="display:flex; gap:16px; margin-bottom:14px;">
          <div><div class="form-hint mb-0" style="margin-bottom:4px;">Cấp độ</div><span class="badge badge-accepted">${EXP_LABEL[data.experience_level]||data.experience_level}</span></div>
          <div><div class="form-hint mb-0" style="margin-bottom:4px;">Số kỹ năng</div><div style="font-family:var(--font-mono); font-weight:700; font-size:1.2rem;">${data.skill_count}</div></div>
        </div>
        ${data.tech_skills?.length ? `<div style="margin-bottom:12px;"><div class="form-hint mb-0" style="margin-bottom:6px;">Kỹ năng kỹ thuật</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${data.tech_skills.slice(0,12).map(s=>`<span class="badge badge-reviewing">${escapeHtml(s)}</span>`).join('')}</div></div>` : ''}
        ${data.suggested_titles?.length ? `<div><div class="form-hint mb-0" style="margin-bottom:6px;">Vị trí phù hợp</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${data.suggested_titles.map(t=>`<span class="badge badge-interview">${escapeHtml(t)}</span>`).join('')}</div></div>` : ''}
      </div>`;
  } catch (err) {
    document.getElementById('ai-analyze-result').innerHTML =
      `<div class="alert alert-error">${err.ai_offline ? '⚠️ AI Service chưa chạy. Khởi động: python ai_service/app.py' : escapeHtml(err.message)}</div>`;
  }
};
