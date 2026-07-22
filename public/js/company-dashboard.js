// public/js/company-dashboard.js

const user = requireAuth(['company']);

let companyProfile = null;
let myJobs = [];
let currentSub = null;
let applicantRequestId = 0;
let applicantSearchTimer = null;

const applicantState = {
  jobId: null,
  status: '',
  search: '',
  skill: '',
  sort: 'newest',
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  counts: {}
};

const VIEW_META = {
  overview: { title: 'Tổng quan', subtitle: 'Tình hình tuyển dụng của doanh nghiệp bạn.' },
  jobs: { title: 'Tin đã đăng', subtitle: 'Quản lý các tin tuyển dụng của doanh nghiệp.' },
  applicants: { title: 'Quản lý ứng viên', subtitle: 'Theo dõi và xử lý hồ sơ ứng tuyển theo từng vị trí.' },
  profile: { title: 'Hồ sơ công ty', subtitle: 'Thông tin này sẽ hiển thị công khai trên tin tuyển dụng.' }
};

function switchView(view) {
  if (!VIEW_META[view]) return;
  document.querySelectorAll('.dash-nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === view));
  document.querySelectorAll('.dash-view').forEach((el) => { el.style.display = el.id === `view-${view}` ? 'block' : 'none'; });
  document.getElementById('view-title').textContent = VIEW_META[view].title;
  document.getElementById('view-subtitle').textContent = VIEW_META[view].subtitle;
  renderHeaderAction(view);
  if (typeof syncDashboardView === 'function') syncDashboardView(view);
}

document.querySelectorAll('.dash-nav a[data-view]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    (window.switchView || switchView)(a.dataset.view);
  });
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

const MAX_JOB_SALARY = 2000000000;

function getVndDigits(value) {
  return String(value ?? '')
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '');
}

function formatVndInput(value) {
  const digits = getVndDigits(value);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseVndInput(value) {
  const digits = getVndDigits(value);
  return digits ? Number(digits) : null;
}

function setupVndInput(input) {
  input.addEventListener('input', () => {
    input.value = formatVndInput(input.value);
  });
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
            <input type="text" id="jf-salary-min" class="input" inputmode="numeric" autocomplete="off"
              maxlength="13" placeholder="Ví dụ: 10.000.000" value="${formatVndInput(job?.salary_min)}">
          </div>
          <div class="form-group">
            <label>Lương tối đa (VNĐ)</label>
            <input type="text" id="jf-salary-max" class="input" inputmode="numeric" autocomplete="off"
              maxlength="13" placeholder="Ví dụ: 20.000.000" value="${formatVndInput(job?.salary_max)}">
          </div>
        </div>
        <p class="form-hint" style="margin-top:-12px; margin-bottom:18px;">Để trống cả hai ô nếu mức lương thỏa thuận.</p>
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

  const salaryMinInput = document.getElementById('jf-salary-min');
  const salaryMaxInput = document.getElementById('jf-salary-max');
  setupVndInput(salaryMinInput);
  setupVndInput(salaryMaxInput);

  document.getElementById('job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('job-submit-btn');
    const alertSlot = document.getElementById('job-modal-alert');
    alertSlot.innerHTML = '';

    const salaryMin = parseVndInput(salaryMinInput.value);
    const salaryMax = parseVndInput(salaryMaxInput.value);

    if ((salaryMin !== null && salaryMin <= 0) || (salaryMax !== null && salaryMax <= 0)) {
      alertSlot.innerHTML = '<div class="alert alert-error">Mức lương phải lớn hơn 0 VNĐ.</div>';
      (salaryMin !== null && salaryMin <= 0 ? salaryMinInput : salaryMaxInput).focus();
      return;
    }
    if ((salaryMin !== null && salaryMin > MAX_JOB_SALARY) || (salaryMax !== null && salaryMax > MAX_JOB_SALARY)) {
      alertSlot.innerHTML = '<div class="alert alert-error">Mức lương không được vượt quá 2.000.000.000 VNĐ.</div>';
      (salaryMin !== null && salaryMin > MAX_JOB_SALARY ? salaryMinInput : salaryMaxInput).focus();
      return;
    }
    if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
      alertSlot.innerHTML = '<div class="alert alert-error">Lương tối thiểu không được lớn hơn lương tối đa.</div>';
      salaryMaxInput.focus();
      return;
    }

    const body = {
      title: document.getElementById('jf-title').value.trim(),
      category_id: document.getElementById('jf-category').value || null,
      job_type: document.getElementById('jf-job-type').value,
      description: document.getElementById('jf-description').value.trim(),
      requirements: document.getElementById('jf-requirements').value.trim(),
      benefits: document.getElementById('jf-benefits').value.trim(),
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_negotiable: salaryMin === null && salaryMax === null,
      location: document.getElementById('jf-location').value.trim(),
      vacancies: document.getElementById('jf-vacancies').value || 1,
      experience_level: document.getElementById('jf-experience').value.trim(),
      deadline: document.getElementById('jf-deadline').value || null,
      is_vip: document.getElementById('jf-vip') ? document.getElementById('jf-vip').checked : false
    };

    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span> Đang xử lý...`;

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
    document.getElementById('applicant-stage-tabs').innerHTML = '';
    document.getElementById('applicant-results-summary').textContent = 'Hãy đăng tin tuyển dụng trước để nhận hồ sơ.';
    return;
  }
  select.innerHTML = myJobs.map((j) => `<option value="${j.id}">${escapeHtml(j.title)} (${j.application_count || 0} ứng viên)</option>`).join('');
  const selectedJob = myJobs.find((job) => Number(job.id) === Number(applicantState.jobId)) || myJobs[0];
  select.value = selectedJob.id;
  select.onchange = () => {
    applicantState.status = '';
    applicantState.page = 1;
    loadApplicants(select.value, { resetPage: true });
  };
  loadApplicants(selectedJob.id, { resetPage: Number(applicantState.jobId) !== Number(selectedJob.id) });
}

const PIPELINE_STAGES = [
  { key: 'pending', label: 'Mới ứng tuyển' },
  { key: 'reviewing', label: 'Đang xem xét' },
  { key: 'interview', label: 'Phỏng vấn' },
  { key: 'accepted', label: 'Đã nhận' },
  { key: 'rejected', label: 'Đã từ chối' }
];

const ALL_APPLICANT_STAGE = { key: '', label: 'Tất cả' };

const PIPELINE_TRANSITIONS = {
  pending: ['reviewing', 'rejected'],
  reviewing: ['pending', 'interview', 'rejected'],
  interview: ['reviewing', 'accepted', 'rejected'],
  accepted: ['reviewing'],
  rejected: ['reviewing']
};

function statusOptionsHtml(app) {
  const allowed = new Set([app.status, ...(PIPELINE_TRANSITIONS[app.status] || [])]);
  return PIPELINE_STAGES
    .filter((stage) => allowed.has(stage.key))
    .map((stage) => `<option value="${stage.key}" ${app.status === stage.key ? 'selected' : ''}>${stage.label}</option>`)
    .join('');
}

function applicantCardHtml(app) {
  const displayName = String(app.display_name || app.full_name || app.email || 'Ứng viên chưa cập nhật tên').trim();
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const hasScore = app.ai_score !== null && app.ai_score !== undefined && app.ai_score !== '';
  const appliedDate = app.applied_at ? new Date(app.applied_at).toLocaleDateString('vi-VN') : 'Chưa rõ';
  return `
    <div class="applicant-card">
      <div class="ac-head">
        <div class="ac-avatar">${escapeHtml(initials || '?')}</div>
        <div class="ac-primary">
          <div class="ac-name">${escapeHtml(displayName)}</div>
          <div class="ac-email">${escapeHtml(app.email || 'Chưa có email')}</div>
        </div>
        <div class="ac-score ${hasScore ? 'has-score' : ''}" title="${escapeHtml(app.ai_label || 'Chưa phân tích mức độ phù hợp')}">
          ${hasScore ? `${Number(app.ai_score).toLocaleString('vi-VN')} điểm` : 'Chưa chấm AI'}
        </div>
      </div>
      <div class="ac-details">
        <div>
          <div class="ac-detail-label">Số điện thoại</div>
          <div class="ac-detail-value">${escapeHtml(app.phone || 'Chưa cập nhật')}</div>
        </div>
        <div>
          <div class="ac-detail-label">Ngày ứng tuyển</div>
          <div class="ac-detail-value">${appliedDate}</div>
        </div>
        <div class="ac-skills">
          <div class="ac-detail-label">Kỹ năng</div>
          <div class="ac-detail-value">${escapeHtml(app.skills ? `${app.skills.slice(0, 140)}${app.skills.length > 140 ? '...' : ''}` : 'Chưa cập nhật')}</div>
        </div>
      </div>
      ${app.status_note ? `<div class="ac-note"><strong>Ghi chú:</strong> ${escapeHtml(app.status_note)}</div>` : ''}
      <div class="ac-actions">
        ${app.cv_url ? `<a href="${app.cv_url}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Xem CV</a>` : ''}
        <button type="button" class="btn btn-outline btn-sm" onclick="analyzeCandidate(${app.id})">AI phân tích</button>
        <button type="button" class="btn btn-ghost btn-sm" data-status-history="${app.id}">Lịch sử</button>
        <select class="input ac-status" aria-label="Trạng thái hồ sơ" data-application-status="${app.id}" data-current-status="${app.status}">
          ${statusOptionsHtml(app)}
        </select>
      </div>
    </div>
  `;
}

function requestStatusChange(app, nextStatus) {
  const nextLabel = PIPELINE_STAGES.find((stage) => stage.key === nextStatus)?.label || nextStatus;
  const isReopening = ['accepted', 'rejected'].includes(app.status);
  const needsReason = nextStatus === 'rejected';

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box" style="max-width:480px;" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3 class="mb-0">${isReopening ? 'Mở lại hồ sơ' : `Chuyển sang “${nextLabel}”`}</h3>
          <button type="button" class="modal-close" data-status-cancel>&times;</button>
        </div>
        <p style="color:var(--ink-soft); margin-bottom:16px;">
          ${isReopening
            ? 'Hồ sơ này đã kết thúc. Sau khi mở lại, hồ sơ sẽ chuyển về giai đoạn Đang xem xét.'
            : `Xác nhận cập nhật trạng thái của ${escapeHtml(app.display_name || app.email)}.`}
        </p>
        ${needsReason ? `
          <div class="form-group">
            <label for="status-change-note">Lý do từ chối *</label>
            <textarea id="status-change-note" class="input" maxlength="1000" required placeholder="Nêu lý do ngắn gọn để ứng viên hiểu kết quả..."></textarea>
          </div>` : ''}
        <div id="status-change-alert"></div>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn btn-outline" data-status-cancel>Hủy</button>
          <button type="button" class="btn btn-primary" id="status-change-confirm">Xác nhận</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    let settled = false;
    const close = (result) => {
      if (settled) return;
      settled = true;
      overlay.remove();
      resolve(result);
    };
    overlay.querySelectorAll('[data-status-cancel]').forEach((button) => {
      button.addEventListener('click', () => close(null));
    });
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(null);
    });
    overlay.querySelector('#status-change-confirm').addEventListener('click', () => {
      const note = overlay.querySelector('#status-change-note')?.value.trim() || '';
      if (needsReason && note.length < 3) {
        overlay.querySelector('#status-change-alert').innerHTML = '<div class="alert alert-error">Vui lòng nhập lý do từ chối.</div>';
        overlay.querySelector('#status-change-note').focus();
        return;
      }
      close({ note, confirm_reopen: isReopening });
    });
    overlay.querySelector('#status-change-note')?.focus();
  });
}

async function showApplicationHistory(applicationId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:520px;" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3 class="mb-0">Lịch sử xử lý hồ sơ</h3>
        <button type="button" class="modal-close">&times;</button>
      </div>
      <div id="status-history-content"><div class="loading-spinner"></div></div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });

  try {
    const history = await apiFetch(`/applications/${applicationId}/history`);
    document.getElementById('status-history-content').innerHTML = history.length
      ? history.map((item) => `
          <div style="padding:12px 0; border-bottom:1px solid var(--border);">
            <div style="font-weight:600; font-size:0.88rem;">${STATUS_LABELS[item.from_status] || item.from_status} → ${STATUS_LABELS[item.to_status] || item.to_status}</div>
            <div class="form-hint">${new Date(item.changed_at).toLocaleString('vi-VN')} · ${escapeHtml(item.changed_by_email || 'Tài khoản đã xóa')}</div>
            ${item.note ? `<p style="font-size:0.82rem; margin:6px 0 0;">${escapeHtml(item.note)}</p>` : ''}
          </div>`).join('')
      : '<div class="empty-state" style="padding:28px 0;">Chưa có thay đổi trạng thái nào.</div>';
  } catch (err) {
    document.getElementById('status-history-content').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function renderApplicantStageTabs() {
  const stages = [ALL_APPLICANT_STAGE, ...PIPELINE_STAGES];
  const total = PIPELINE_STAGES.reduce((sum, stage) => sum + Number(applicantState.counts[stage.key] || 0), 0);
  const tabs = document.getElementById('applicant-stage-tabs');
  tabs.innerHTML = stages.map((stage) => {
    const count = stage.key ? Number(applicantState.counts[stage.key] || 0) : total;
    return `
      <button type="button" role="tab" class="applicant-stage-tab ${applicantState.status === stage.key ? 'active' : ''}"
        aria-selected="${applicantState.status === stage.key}" data-applicant-stage="${stage.key}">
        ${stage.label}<span class="applicant-stage-count">${count}</span>
      </button>`;
  }).join('');

  tabs.querySelectorAll('[data-applicant-stage]').forEach((button) => {
    button.addEventListener('click', () => {
      if (applicantState.status === button.dataset.applicantStage) return;
      applicantState.status = button.dataset.applicantStage;
      applicantState.page = 1;
      loadApplicants(applicantState.jobId);
    });
  });
}

function renderApplicantPagination() {
  const el = document.getElementById('applicant-pagination');
  if (applicantState.totalPages <= 1) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `
    <button type="button" class="btn btn-outline btn-sm" data-applicant-page="prev" ${applicantState.page <= 1 ? 'disabled' : ''}>Trước</button>
    <span class="applicant-pagination-info">Trang ${applicantState.page}/${applicantState.totalPages}</span>
    <button type="button" class="btn btn-outline btn-sm" data-applicant-page="next" ${applicantState.page >= applicantState.totalPages ? 'disabled' : ''}>Sau</button>
  `;
  el.querySelector('[data-applicant-page="prev"]').addEventListener('click', () => {
    applicantState.page -= 1;
    loadApplicants(applicantState.jobId);
  });
  el.querySelector('[data-applicant-page="next"]').addEventListener('click', () => {
    applicantState.page += 1;
    loadApplicants(applicantState.jobId);
  });
}

function bindApplicantCardEvents(apps, jobId) {
  const pipelineEl = document.getElementById('pipeline');
  pipelineEl.querySelectorAll('[data-application-status]').forEach((select) => {
    select.addEventListener('change', async () => {
      const app = apps.find((item) => Number(item.id) === Number(select.dataset.applicationStatus));
      const previousStatus = select.dataset.currentStatus;
      const nextStatus = select.value;
      select.value = previousStatus;
      if (!app || nextStatus === previousStatus) return;

      const confirmation = await requestStatusChange(app, nextStatus);
      if (!confirmation) return;

      select.disabled = true;
      try {
        await apiFetch(`/applications/${app.id}/status`, {
          method: 'PUT',
          body: { status: nextStatus, ...confirmation }
        });
        showToast('Đã cập nhật trạng thái ứng viên.', 'success');
        await loadApplicants(jobId);
      } catch (err) {
        showToast(err.message, 'error');
        select.disabled = false;
      }
    });
  });
  pipelineEl.querySelectorAll('[data-status-history]').forEach((button) => {
    button.addEventListener('click', () => showApplicationHistory(Number(button.dataset.statusHistory)));
  });
}

async function loadApplicants(jobId, { resetPage = false } = {}) {
  if (!jobId) return;
  applicantState.jobId = Number(jobId);
  if (resetPage) applicantState.page = 1;
  const requestId = ++applicantRequestId;
  const pipelineEl = document.getElementById('pipeline');
  const emptyEl = document.getElementById('applicants-empty');
  const summaryEl = document.getElementById('applicant-results-summary');
  pipelineEl.classList.add('is-loading');
  pipelineEl.innerHTML = '<span class="loading-spinner"></span>';
  emptyEl.style.display = 'none';
  document.getElementById('applicant-pagination').innerHTML = '';

  const params = new URLSearchParams({
    page: String(applicantState.page),
    limit: String(applicantState.limit),
    sort: applicantState.sort
  });
  if (applicantState.status) params.set('status', applicantState.status);
  if (applicantState.search) params.set('search', applicantState.search);
  if (applicantState.skill) params.set('skill', applicantState.skill);

  try {
    const data = await apiFetch(`/applications/job/${jobId}?${params.toString()}`);
    if (requestId !== applicantRequestId) return;

    applicantState.total = Number(data.total || 0);
    applicantState.totalPages = Number(data.totalPages || 0);
    applicantState.counts = data.counts || {};
    const apps = data.applications || [];

    if (applicantState.totalPages > 0 && applicantState.page > applicantState.totalPages) {
      applicantState.page = applicantState.totalPages;
      return loadApplicants(jobId);
    }

    renderApplicantStageTabs();
    const activeStage = PIPELINE_STAGES.find((stage) => stage.key === applicantState.status);
    document.getElementById('applicant-results-title').textContent = activeStage ? activeStage.label : 'Tất cả ứng viên';
    const start = applicantState.total ? ((applicantState.page - 1) * applicantState.limit) + 1 : 0;
    const end = Math.min(applicantState.page * applicantState.limit, applicantState.total);
    summaryEl.textContent = applicantState.total
      ? `Hiển thị ${start}-${end} trong ${applicantState.total} hồ sơ`
      : 'Không tìm thấy hồ sơ phù hợp';

    pipelineEl.classList.remove('is-loading');
    if (apps.length === 0) {
      pipelineEl.innerHTML = '';
      emptyEl.style.display = 'block';
      emptyEl.querySelector('p').textContent = applicantState.search || applicantState.skill
        ? 'Không có ứng viên phù hợp với từ khóa và bộ lọc hiện tại.'
        : activeStage
          ? `Chưa có ứng viên ở giai đoạn “${activeStage.label}”.`
          : 'Chưa có ứng viên nào ứng tuyển vào tin này.';
      renderApplicantPagination();
      return;
    }
    emptyEl.style.display = 'none';
    pipelineEl.innerHTML = apps.map(applicantCardHtml).join('');
    bindApplicantCardEvents(apps, jobId);
    renderApplicantPagination();
  } catch (err) {
    if (requestId !== applicantRequestId) return;
    pipelineEl.classList.remove('is-loading');
    pipelineEl.innerHTML = `<div class="alert alert-error" style="grid-column:1/-1;">${escapeHtml(err.message)}</div>`;
    summaryEl.textContent = 'Không tải được dữ liệu ứng viên.';
    showToast('Không tải được danh sách ứng viên: ' + err.message, 'error');
  }
}

function setupApplicantFilters() {
  const triggerSearch = () => {
    clearTimeout(applicantSearchTimer);
    applicantSearchTimer = setTimeout(() => {
      applicantState.search = document.getElementById('applicant-search').value.trim();
      applicantState.skill = document.getElementById('applicant-skill').value.trim();
      applicantState.page = 1;
      loadApplicants(applicantState.jobId);
    }, 350);
  };
  document.getElementById('applicant-search').addEventListener('input', triggerSearch);
  document.getElementById('applicant-skill').addEventListener('input', triggerSearch);
  document.getElementById('applicant-sort').addEventListener('change', (event) => {
    applicantState.sort = event.target.value;
    applicantState.page = 1;
    loadApplicants(applicantState.jobId);
  });
  document.getElementById('applicant-clear-filters').addEventListener('click', () => {
    clearTimeout(applicantSearchTimer);
    document.getElementById('applicant-search').value = '';
    document.getElementById('applicant-skill').value = '';
    document.getElementById('applicant-sort').value = 'newest';
    Object.assign(applicantState, { search: '', skill: '', sort: 'newest', status: '', page: 1 });
    loadApplicants(applicantState.jobId);
  });
}

setupApplicantFilters();

async function init() {
  await loadProfile();
  await loadJobs();
  try { currentSub = await apiFetch('/payments/subscription'); } catch(e) { currentSub = null; }
  const requestedView = new URLSearchParams(window.location.search).get('view');
  if (requestedView && VIEW_META[requestedView]) {
    (window.switchView || switchView)(requestedView);
  } else {
    renderHeaderAction('overview');
  }
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
            ${sub ? 'Nâng cấp gói' : 'Xem và chọn gói'}
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
                 <thead><tr><th>Gói</th><th>Mã đơn</th><th>Số tiền</th><th>Phương thức</th><th>Trạng thái</th><th>Ngày</th><th></th></tr></thead>
                 <tbody>
                   ${payments.map(p => `
                     <tr>
                       <td><strong>${escapeHtml(p.package_name)}</strong></td>
                       <td style="font-family:var(--font-mono); font-size:.78rem;">${escapeHtml(p.transaction_code || '—')}</td>
                       <td style="font-family:var(--font-mono);">${Number(p.amount).toLocaleString('vi-VN')} đ</td>
                       <td>${p.payment_method === 'bank_transfer' ? 'Chuyển khoản' : p.payment_method === 'demo' ? 'Demo cũ' : 'MoMo cũ'}</td>
                       <td><span class="badge badge-${p.status === 'completed' ? 'accepted' : p.status === 'pending' ? 'pending' : 'rejected'}">${p.status === 'completed' ? 'Hoàn tất' : p.status === 'pending' ? 'Chờ thanh toán' : p.status === 'expired' ? 'Hết hạn' : 'Thất bại'}</span></td>
                       <td style="font-size:0.82rem; color:var(--ink-faint);">${new Date(p.created_at).toLocaleDateString('vi-VN')}</td>
                       <td>${p.transaction_code ? `<a class="btn btn-outline btn-sm" href="/packages.html?payment=${p.id}">Xem đơn</a>` : ''}</td>
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

// ── AI PHAN TICH UNG VIEN ─────────────────────────────────────
window.analyzeCandidate = async function(applicationId) {
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
    const data = await apiFetch('/ai/analyze-application/' + applicationId);
    const EXP_LABEL = { fresher:'Fresher (Mới ra trường)', junior:'Junior (1-2 năm)', middle:'Middle (3-5 năm)', senior:'Senior (5+ năm)' };
    document.getElementById('ai-analyze-result').innerHTML = `
      <div style="text-align:left;">
        <div style="background:var(--primary-light); border-radius:var(--radius-sm); padding:12px; margin-bottom:16px;">
          <strong>${escapeHtml(data.candidate_name || 'Ứng viên')}</strong><br>
          <span style="font-size:0.85rem; color:var(--primary-dark);">${escapeHtml(data.summary)}</span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:14px;">
          <div>
            <div class="form-hint mb-0" style="margin-bottom:3px;">Mức độ phù hợp với tin tuyển dụng</div>
            <strong>${escapeHtml(data.match_label || 'Chưa xác định')}</strong>
          </div>
          <div style="font-family:var(--font-mono); font-size:1.35rem; font-weight:700; color:var(--primary-dark);">${Number(data.match_score || 0).toLocaleString('vi-VN')} điểm</div>
        </div>
        ${data.cv_read_warning ? `<div class="alert alert-warning" style="margin-bottom:14px;">${escapeHtml(data.cv_read_warning)}</div>` : ''}
        <div style="display:flex; gap:16px; margin-bottom:14px;">
          <div><div class="form-hint mb-0" style="margin-bottom:4px;">Cấp độ</div><span class="badge badge-accepted">${EXP_LABEL[data.experience_level]||data.experience_level}</span></div>
          <div><div class="form-hint mb-0" style="margin-bottom:4px;">Số kỹ năng</div><div style="font-family:var(--font-mono); font-weight:700; font-size:1.2rem;">${data.skill_count}</div></div>
        </div>
        ${data.tech_skills?.length ? `<div style="margin-bottom:12px;"><div class="form-hint mb-0" style="margin-bottom:6px;">Kỹ năng kỹ thuật</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${data.tech_skills.slice(0,12).map(s=>`<span class="badge badge-reviewing">${escapeHtml(s)}</span>`).join('')}</div></div>` : ''}
        ${data.suggested_titles?.length ? `<div><div class="form-hint mb-0" style="margin-bottom:6px;">Vị trí phù hợp</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${data.suggested_titles.map(t=>`<span class="badge badge-interview">${escapeHtml(t)}</span>`).join('')}</div></div>` : ''}
      </div>`;
    loadApplicants(applicantState.jobId);
  } catch (err) {
    document.getElementById('ai-analyze-result').innerHTML =
      `<div class="alert alert-error">${err.ai_offline ? '⚠️ AI Service chưa chạy. Khởi động: python ai_service/app.py' : escapeHtml(err.message)}</div>`;
  }
};
