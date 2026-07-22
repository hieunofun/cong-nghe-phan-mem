// public/js/candidate-dashboard.js

const user = requireAuth(['candidate']);
let candidateApplicationsCache = [];
let savedJobsCache = [];

const VIEW_META = {
  profile: { title: 'Hồ sơ của tôi', subtitle: 'Cập nhật thông tin để nhà tuyển dụng hiểu rõ hơn về bạn.' },
  applications: { title: 'Đơn đã ứng tuyển', subtitle: 'Theo dõi trạng thái xử lý hồ sơ ứng tuyển của bạn.' },
  saved: { title: 'Tìm việc & tin đã lưu', subtitle: 'Quản lý tin đã lưu và tìm cơ hội mới trong cùng một nơi.' }
};

function switchView(view) {
  document.querySelectorAll('.dash-nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === view));
  document.querySelectorAll('.dash-view').forEach((el) => { el.style.display = el.id === `view-${view}` ? 'block' : 'none'; });
  document.getElementById('view-title').textContent = VIEW_META[view].title;
  document.getElementById('view-subtitle').textContent = VIEW_META[view].subtitle;
  if (typeof syncDashboardView === 'function') syncDashboardView(view);
}

document.querySelectorAll('.dash-nav a[data-view]').forEach((a) => {
  a.addEventListener('click', (e) => { e.preventDefault(); switchView(a.dataset.view); });
});

function fillProfileForm(profile) {
  document.getElementById('full_name').value = profile.full_name || '';
  document.getElementById('phone').value = profile.phone || '';
  document.getElementById('birth_date').value = profile.birth_date || '';
  document.getElementById('gender').value = profile.gender || '';
  document.getElementById('address').value = profile.address || '';
  document.getElementById('skills').value = profile.skills || '';
  document.getElementById('experience').value = profile.experience || '';
  document.getElementById('education').value = profile.education || '';

  document.getElementById('sidebar-name').textContent = profile.full_name || user.email;
  document.getElementById('sidebar-avatar').innerHTML = profile.avatar_url
    ? `<img src="${profile.avatar_url}" alt="avatar">`
    : (profile.full_name || '?')[0].toUpperCase();

  document.getElementById('avatar-preview').innerHTML = profile.avatar_url
    ? `<img src="${profile.avatar_url}" alt="avatar">` : 'Ảnh';

  const cvLink = document.getElementById('cv-view-link');
  if (profile.cv_url) {
    document.getElementById('cv-preview').textContent = '✓ CV';
    cvLink.href = profile.cv_url;
    cvLink.style.display = 'inline-flex';
  } else {
    document.getElementById('cv-preview').textContent = 'CV';
    cvLink.style.display = 'none';
  }
}

async function loadProfile() {
  try {
    const profile = await apiFetch('/candidates/me');
    fillProfileForm(profile);
    if (!String(profile.full_name || '').trim()) {
      document.getElementById('profile-alert-slot').innerHTML = '<div class="alert alert-warning">Họ và tên đang bị thiếu. Vui lòng nhập lại tên thật và lưu hồ sơ.</div>';
    }
  } catch (err) {
    showToast('Không tải được hồ sơ: ' + err.message, 'error');
  }
}

document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('profile-submit-btn');
  const alertSlot = document.getElementById('profile-alert-slot');
  alertSlot.innerHTML = '';
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.innerHTML = `<span class="loading-spinner"></span> Đang lưu...`;

  try {
    const body = {
      full_name: document.getElementById('full_name').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      birth_date: document.getElementById('birth_date').value || null,
      gender: document.getElementById('gender').value || null,
      address: document.getElementById('address').value.trim(),
      skills: document.getElementById('skills').value.trim(),
      experience: document.getElementById('experience').value.trim(),
      education: document.getElementById('education').value.trim()
    };
    const data = await apiFetch('/candidates/me', { method: 'PUT', body });
    fillProfileForm(data.profile);
    showToast('Đã lưu hồ sơ thành công!', 'success');
  } catch (err) {
    alertSlot.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

document.getElementById('avatar-upload-btn').addEventListener('click', () => document.getElementById('avatar-input').click());
document.getElementById('avatar-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    const data = await apiUpload('/candidates/me/avatar', formData);
    document.getElementById('avatar-preview').innerHTML = `<img src="${data.avatar_url}" alt="avatar">`;
    document.getElementById('sidebar-avatar').innerHTML = `<img src="${data.avatar_url}" alt="avatar">`;
    showToast('Đã cập nhật ảnh đại diện!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('cv-upload-btn').addEventListener('click', () => document.getElementById('cv-input').click());
document.getElementById('cv-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const uploadBtn = document.getElementById('cv-upload-btn');
  const originalText = uploadBtn.textContent;
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<span class="loading-spinner"></span> Đang đọc và đồng bộ...';
  try {
    const formData = new FormData();
    formData.append('cv', file);
    const data = await apiUpload('/candidates/me/cv', formData);
    if (data.profile) fillProfileForm(data.profile);

    const fieldLabels = {
      full_name: 'họ tên', phone: 'số điện thoại', address: 'địa chỉ',
      birth_date: 'ngày sinh', gender: 'giới tính', skills: 'kỹ năng',
      experience: 'kinh nghiệm', education: 'học vấn'
    };
    const syncedLabels = (data.synced_fields || []).map((field) => fieldLabels[field] || field);
    const clearedLabels = (data.cleared_fields || []).map((field) => fieldLabels[field] || field);
    const alertSlot = document.getElementById('profile-alert-slot');
    alertSlot.innerHTML = '';
    if (syncedLabels.length) {
      alertSlot.innerHTML += `<div class="alert alert-success">Đã đồng bộ từ CV: ${escapeHtml(syncedLabels.join(', '))}.</div>`;
    }
    if (clearedLabels.length) {
      alertSlot.innerHTML += `<div class="alert alert-warning" style="margin-top:8px;">Đã xóa dữ liệu cũ không có trong CV mới: ${escapeHtml(clearedLabels.join(', '))}.</div>`;
    }
    if (!syncedLabels.length && !clearedLabels.length) {
      alertSlot.innerHTML = `<div class="alert alert-warning">CV đã được tải lên nhưng chưa nhận diện được dữ liệu hồ sơ.</div>`;
    }
    if (data.sync_warning) {
      alertSlot.innerHTML += `<div class="alert alert-warning" style="margin-top:8px;">${escapeHtml(data.sync_warning)}</div>`;
    }
    if (!String(data.profile?.full_name || '').trim()) {
      alertSlot.innerHTML += '<div class="alert alert-warning" style="margin-top:8px;">CV chưa nhận diện được họ tên. Vui lòng nhập lại tên thật và lưu hồ sơ.</div>';
    }
    showToast(data.message || 'Đã tải lên và đồng bộ CV!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = originalText;
    e.target.value = '';
  }
});

function statusBadge(status) {
  return `<span class="badge badge-${status}">${STATUS_LABELS[status] || status}</span>`;
}

const APPLICATION_STATUS_META = {
  pending: 'Hồ sơ đã được gửi và đang chờ doanh nghiệp tiếp nhận.',
  reviewing: 'Nhà tuyển dụng đang xem xét thông tin và CV của bạn.',
  interview: 'Hồ sơ đã vào vòng phỏng vấn. Hãy kiểm tra email thường xuyên.',
  accepted: 'Chúc mừng! Doanh nghiệp đã chấp nhận hồ sơ của bạn.',
  rejected: 'Hồ sơ chưa phù hợp với vị trí này. Bạn có thể tiếp tục khám phá cơ hội khác.'
};

function applicationCardHtml(application) {
  const initials = application.company_name.slice(0, 2).toUpperCase();
  return `
    <article class="application-card">
      <div class="application-card-main">
        <div class="application-job">
          <div class="job-logo">${application.logo_url ? `<img src="${application.logo_url}" alt="">` : initials}</div>
          <div style="min-width:0;">
            <h3>${escapeHtml(application.job_title)}</h3>
            <p class="company-name">${escapeHtml(application.company_name)}</p>
            <div class="job-meta">
              <span>📍 ${escapeHtml(application.location || 'Đang cập nhật')}</span>
              <span>🕒 ${JOB_TYPE_LABELS[application.job_type] || application.job_type}</span>
              <span>${formatSalary(application.salary_min, application.salary_max, application.salary_negotiable)}</span>
            </div>
          </div>
        </div>
        <div class="application-status">
          ${statusBadge(application.status)}
          <p>${APPLICATION_STATUS_META[application.status] || 'Trạng thái hồ sơ đang được cập nhật.'}</p>
          ${application.status_note ? `<p><strong>Phản hồi:</strong> ${escapeHtml(application.status_note)}</p>` : ''}
        </div>
      </div>
      <div class="application-card-footer">
        <span class="application-date">Ứng tuyển ngày ${new Date(application.applied_at).toLocaleDateString('vi-VN')}</span>
        <div class="flex gap-8">
          <button type="button" class="btn btn-ghost btn-sm" data-similar-job="${application.job_id}">Việc tương tự</button>
          <button type="button" class="btn btn-outline btn-sm" data-view-job="${application.job_id}">Xem tin</button>
        </div>
      </div>
    </article>
  `;
}

async function loadApplications() {
  const summaryEl = document.getElementById('application-summary');
  const listEl = document.getElementById('applications-list');
  const emptyEl = document.getElementById('applications-empty');
  try {
    const apps = await apiFetch('/candidates/me/applications');
    candidateApplicationsCache = apps;
    if (apps.length === 0) {
      summaryEl.innerHTML = '';
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';
    const awaiting = apps.filter((app) => ['pending', 'reviewing'].includes(app.status)).length;
    const interviews = apps.filter((app) => app.status === 'interview').length;
    const accepted = apps.filter((app) => app.status === 'accepted').length;
    summaryEl.innerHTML = `
      <div class="application-stat"><strong>${apps.length}</strong><span>Tổng đơn đã gửi</span></div>
      <div class="application-stat"><strong>${awaiting}</strong><span>Đang chờ phản hồi</span></div>
      <div class="application-stat"><strong>${interviews}</strong><span>Đang phỏng vấn</span></div>
      <div class="application-stat"><strong>${accepted}</strong><span>Đã được nhận</span></div>
    `;
    listEl.innerHTML = apps.map(applicationCardHtml).join('');
    listEl.querySelectorAll('[data-view-job]').forEach((button) => {
      button.addEventListener('click', () => openApplicationJob(Number(button.dataset.viewJob)));
    });
    listEl.querySelectorAll('[data-similar-job]').forEach((button) => {
      button.addEventListener('click', () => findSimilarJobs(Number(button.dataset.similarJob), button));
    });
  } catch (err) {
    showToast('Không tải được danh sách ứng tuyển: ' + err.message, 'error');
  }
}

async function openAvailableJob(jobId, knownStatus = 'active') {
  if (knownStatus !== 'active') {
    showToast('Tin tuyển dụng hiện không còn hoạt động.', 'info');
    return;
  }

  try {
    const availability = await apiFetch(`/jobs/${jobId}/availability`, { auth: false });
    if (!availability.active) {
      showToast('Tin tuyển dụng hiện không còn hoạt động.', 'info');
      return;
    }
    window.location.href = `/job-detail.html?id=${jobId}`;
  } catch (err) {
    showToast('Tin tuyển dụng hiện không còn tồn tại.', 'info');
  }
}

function openApplicationJob(jobId) {
  const application = candidateApplicationsCache.find((item) => Number(item.job_id) === Number(jobId));
  openAvailableJob(jobId, application?.job_status || 'closed');
}

async function findSimilarJobs(jobId, button) {
  const application = candidateApplicationsCache.find((item) => Number(item.job_id) === Number(jobId));
  if (!application) {
    showToast('Không tìm thấy thông tin đơn ứng tuyển.', 'info');
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.innerHTML = '<span class="loading-spinner"></span> Đang tìm...';

  try {
    const query = new URLSearchParams({ limit: '8' });
    if (application.category_id) query.set('category_id', application.category_id);
    else if (application.job_type) query.set('job_type', application.job_type);
    else query.set('keyword', application.job_title);

    const data = await apiFetch(`/jobs?${query.toString()}`, { auth: false });
    const excludedIds = getExcludedJobIds();
    excludedIds.add(Number(jobId));
    const jobs = (data.jobs || []).filter((job) => !excludedIds.has(Number(job.id))).slice(0, 6);

    if (!jobs.length) {
      showToast('Hiện chưa có việc làm tương tự đang tuyển.', 'info');
      return;
    }

    switchView('saved');
    document.getElementById('dashboard-job-keyword').value = application.category_name || application.job_title;
    document.getElementById('dashboard-job-location').value = '';
    renderDiscoveryJobs(
      jobs,
      'Việc làm tương tự',
      `Các vị trí đang tuyển gần với “${application.job_title}”.`
    );
    document.querySelector('.discovery-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    showToast('Không thể tìm việc tương tự lúc này.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function savedJobCardHtml(job) {
  const initials = job.company_name.slice(0, 2).toUpperCase();
  return `
    <div class="job-card">
      <a href="/job-detail.html?id=${job.id}" data-saved-job="${job.id}" data-job-status="${job.status}" style="text-decoration:none; color:inherit;">
        <div class="job-card-top">
          <div class="job-logo">${job.logo_url ? `<img src="${job.logo_url}" alt="">` : initials}</div>
          <div>
            <h3>${escapeHtml(job.title)}</h3>
            <p class="company-name">${escapeHtml(job.company_name)}</p>
          </div>
        </div>
        <div class="job-meta"><span>📍 ${escapeHtml(job.location || 'Đang cập nhật')}</span></div>
      </a>
      <div class="job-card-footer">
        ${job.status === 'active'
          ? `<span class="job-salary">${formatSalary(job.salary_min, job.salary_max, job.salary_negotiable)}</span>`
          : '<span class="badge badge-closed">Ngừng tuyển</span>'}
        <button class="btn btn-ghost btn-sm" onclick="unsaveJob(${job.id})">Bỏ lưu</button>
      </div>
    </div>
  `;
}

function discoveryJobCardHtml(job) {
  const initials = job.company_name.slice(0, 2).toUpperCase();
  return `
    <a href="/job-detail.html?id=${job.id}" class="job-card" data-discovery-job="${job.id}">
      <div class="job-card-top">
        <div class="job-logo">${job.logo_url ? `<img src="${job.logo_url}" alt="">` : initials}</div>
        <div style="min-width:0;">
          <h3>${escapeHtml(job.title)}</h3>
          <p class="company-name">${escapeHtml(job.company_name)}</p>
        </div>
      </div>
      <div class="job-meta">
        <span>📍 ${escapeHtml(job.location || 'Đang cập nhật')}</span>
        <span>🕒 ${JOB_TYPE_LABELS[job.job_type] || job.job_type}</span>
      </div>
      <div class="job-card-footer">
        <span class="job-salary">${formatSalary(job.salary_min, job.salary_max, job.salary_negotiable)}</span>
        <span class="form-hint">${timeAgo(job.created_at)}</span>
      </div>
    </a>
  `;
}

function getExcludedJobIds() {
  return new Set([
    ...savedJobsCache.map((job) => Number(job.id)),
    ...candidateApplicationsCache.map((application) => Number(application.job_id))
  ]);
}

function attachJobAvailabilityHandlers(container) {
  container.querySelectorAll('[data-saved-job], [data-discovery-job]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const jobId = Number(link.dataset.savedJob || link.dataset.discoveryJob);
      openAvailableJob(jobId, link.dataset.jobStatus || 'active');
    });
  });
}

function renderDiscoveryJobs(jobs, title = 'Khám phá việc làm', subtitle = 'Những cơ hội mới bạn chưa lưu hoặc ứng tuyển.') {
  const discoveryGrid = document.getElementById('discovery-grid');
  document.getElementById('discovery-title').textContent = title;
  document.getElementById('discovery-subtitle').textContent = subtitle;
  discoveryGrid.innerHTML = jobs.length
    ? jobs.map(discoveryJobCardHtml).join('')
    : '<div class="saved-empty-compact" style="grid-column:1/-1;">Hiện chưa có việc làm phù hợp đang tuyển.</div>';
  attachJobAvailabilityHandlers(discoveryGrid);
}

async function searchDashboardJobs({ keyword = '', location = '' } = {}) {
  const button = document.getElementById('dashboard-job-search-btn');
  const originalText = button.textContent;
  button.disabled = true;
  button.innerHTML = '<span class="loading-spinner"></span> Đang tìm...';

  try {
    const query = new URLSearchParams({ limit: '8' });
    if (keyword) query.set('keyword', keyword);
    if (location) query.set('location', location);
    const data = await apiFetch(`/jobs?${query.toString()}`, { auth: false });
    const excludedIds = getExcludedJobIds();
    const jobs = (data.jobs || []).filter((job) => !excludedIds.has(Number(job.id))).slice(0, 6);
    const hasFilters = Boolean(keyword || location);
    renderDiscoveryJobs(
      jobs,
      hasFilters ? 'Kết quả tìm kiếm' : 'Khám phá việc làm',
      hasFilters
        ? `Việc làm đang tuyển${keyword ? ` phù hợp với “${keyword}”` : ''}${location ? ` tại “${location}”` : ''}.`
        : 'Những cơ hội mới bạn chưa lưu hoặc ứng tuyển.'
    );
    if (!jobs.length && hasFilters) {
      showToast('Hiện chưa có việc làm mới phù hợp với tìm kiếm của bạn.', 'info');
    }
  } catch (err) {
    showToast('Không thể tìm kiếm việc làm lúc này.', 'error');
    renderDiscoveryJobs([], 'Kết quả tìm kiếm', 'Vui lòng thử lại sau.');
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function loadSavedJobs() {
  const grid = document.getElementById('saved-grid');
  const emptyEl = document.getElementById('saved-empty');
  const countEl = document.getElementById('saved-count');
  try {
    const [jobs, applications, discoveryData] = await Promise.all([
      apiFetch('/candidates/me/saved-jobs'),
      apiFetch('/candidates/me/applications'),
      apiFetch('/jobs?limit=8', { auth: false })
    ]);

    savedJobsCache = jobs;
    candidateApplicationsCache = applications;
    countEl.textContent = `${jobs.length} tin`;
    if (!jobs.length) {
      grid.style.display = 'none';
      grid.innerHTML = '';
      emptyEl.style.display = 'block';
    } else {
      grid.style.display = 'grid';
      emptyEl.style.display = 'none';
      grid.innerHTML = jobs.map(savedJobCardHtml).join('');
      attachJobAvailabilityHandlers(grid);
    }

    const excludedIds = getExcludedJobIds();
    const discoveryJobs = (discoveryData.jobs || []).filter((job) => !excludedIds.has(Number(job.id))).slice(0, 6);
    renderDiscoveryJobs(discoveryJobs);
  } catch (err) {
    showToast('Không tải được tin đã lưu: ' + err.message, 'error');
    renderDiscoveryJobs([], 'Khám phá việc làm', 'Không tải được dữ liệu. Vui lòng thử lại sau.');
  }
}

document.getElementById('dashboard-job-search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  searchDashboardJobs({
    keyword: document.getElementById('dashboard-job-keyword').value.trim(),
    location: document.getElementById('dashboard-job-location').value.trim()
  });
});

window.unsaveJob = async function (jobId) {
  try {
    await apiFetch(`/candidates/me/saved-jobs/${jobId}`, { method: 'DELETE' });
    showToast('Đã bỏ lưu tin.', 'success');
    loadSavedJobs();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

loadProfile();
loadApplications();
loadSavedJobs();

// ============================================================
// AI TAB
// ============================================================

Object.assign(VIEW_META || {}, {
  ai: { title: 'AI Phân tích', subtitle: 'Dùng AI để phân tích hồ sơ và tìm việc phù hợp.' }
});

const EXP_LABEL = { fresher: 'Fresher (Mới ra trường)', junior: 'Junior (1-2 năm)', middle: 'Middle (3-5 năm)', senior: 'Senior (5+ năm)' };

document.getElementById('analyze-cv-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('analyze-cv-btn');
  const resultEl = document.getElementById('ai-analysis-result');
  btn.disabled = true;
  btn.innerHTML = `<span class="loading-spinner"></span> Đang phân tích...`;
  resultEl.style.display = 'none';

  try {
    const data = await apiFetch('/ai/analyze-cv');
    const sourceLabels = {
      cv: 'CV hiện tại',
      profile: 'hồ sơ đã lưu',
      cv_and_profile: 'CV hiện tại và hồ sơ đã lưu'
    };
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div class="card">
        <h3 style="font-size:0.95rem; margin-bottom:14px;">📊 Kết quả phân tích</h3>
        <div class="form-hint" style="margin-bottom:12px;">Nguồn: <strong>${escapeHtml(sourceLabels[data.input_source] || data.input_source || 'không xác định')}</strong></div>
        ${data.cv_read_warning ? `<div class="alert alert-warning" style="margin-bottom:14px;">${escapeHtml(data.cv_read_warning)}</div>` : ''}
        <div style="background:var(--primary-light); border-radius:var(--radius-sm); padding:14px; margin-bottom:18px;">
          <p style="margin:0; color:var(--primary-dark); font-size:0.9rem;">${escapeHtml(data.summary)}</p>
        </div>
        <div class="form-row" style="margin-bottom:14px;">
          <div>
            <div class="form-hint mb-0" style="margin-bottom:6px;">Cấp độ kinh nghiệm</div>
            <span class="badge badge-accepted" style="font-size:0.88rem; padding:6px 14px;">${EXP_LABEL[data.experience_level] || data.experience_level}</span>
          </div>
          <div>
            <div class="form-hint mb-0" style="margin-bottom:6px;">Số kỹ năng phát hiện</div>
            <div style="font-family:var(--font-mono); font-size:1.4rem; font-weight:700; color:var(--primary-dark);">${data.skill_count}</div>
          </div>
        </div>
        ${data.tech_skills?.length ? `
          <div style="margin-bottom:14px;">
            <div class="form-hint mb-0" style="margin-bottom:8px;">Kỹ năng kỹ thuật phát hiện</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">${data.tech_skills.map(s => `<span class="badge badge-reviewing">${escapeHtml(s)}</span>`).join('')}</div>
          </div>` : ''}
        ${data.soft_skills?.length ? `
          <div style="margin-bottom:14px;">
            <div class="form-hint mb-0" style="margin-bottom:8px;">Kỹ năng mềm</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">${data.soft_skills.map(s => `<span class="badge badge-pending">${escapeHtml(s)}</span>`).join('')}</div>
          </div>` : ''}
        ${data.target_position ? `
          <div style="margin-bottom:14px;">
            <div class="form-hint mb-0" style="margin-bottom:8px;">Vị trí ứng tuyển ghi trong CV</div>
            <span class="badge badge-accepted">${escapeHtml(data.target_position)}</span>
          </div>` : ''}
        ${data.suggested_titles?.length ? `
          <div>
            <div class="form-hint mb-0" style="margin-bottom:8px;">Vị trí gợi ý phù hợp</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">${data.suggested_titles.map(t => `<span class="badge badge-interview">${escapeHtml(t)}</span>`).join('')}</div>
          </div>` : ''}
      </div>
    `;
    showToast('Phân tích CV hoàn tất!', 'success');
  } catch (err) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `<div class="alert alert-error">${err.ai_offline ? '⚠️ AI Service chưa chạy. Vui lòng khởi động: python ai_service/app.py' : escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔍 Phân tích CV ngay';
  }
});

document.getElementById('get-recommend-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('get-recommend-btn');
  const recEl = document.getElementById('ai-recommendations');
  btn.disabled = true;
  btn.innerHTML = `<span class="loading-spinner"></span> Đang tìm việc phù hợp...`;
  recEl.innerHTML = '';

  try {
    const data = await apiFetch('/ai/recommend');
    const recs = data.recommendations || [];
    if (!recs.length) {
      recEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>Chưa tìm được việc phù hợp. Hãy cập nhật thêm kỹ năng và kinh nghiệm vào hồ sơ.</p></div>`;
    } else {
      recEl.innerHTML = `${data.cv_read_warning ? `<div class="alert alert-warning" style="margin-bottom:12px;">${escapeHtml(data.cv_read_warning)}</div>` : ''}${recs.map(r => {
        const j = r.job;
        if (!j) return '';
        const scoreColor = r.score >= 70 ? 'var(--success)' : r.score >= 45 ? 'var(--warning)' : 'var(--ink-faint)';
        return `
          <div style="border:1px solid var(--border); border-radius:var(--radius-sm); padding:14px; margin-bottom:10px; display:flex; gap:14px; align-items:center;">
            <div style="flex:1; min-width:0;">
              <a href="/job-detail.html?id=${j.id}" style="font-weight:700; font-size:0.95rem;">${escapeHtml(j.title)}</a>
              <div style="font-size:0.82rem; color:var(--ink-soft);">${escapeHtml(j.company_name)} · ${escapeHtml(j.location || '')}</div>
            </div>
            <div style="text-align:center; flex-shrink:0;">
              <div style="font-family:var(--font-mono); font-size:1.3rem; font-weight:800; color:${scoreColor};">${r.score}%</div>
              <div style="font-size:0.72rem; color:var(--ink-faint);">${r.label}</div>
            </div>
          </div>
        `;
      }).join('')}`;
    }
    showToast(`Tìm được ${recs.length} việc phù hợp!`, 'success');
  } catch (err) {
    recEl.innerHTML = `<div class="alert alert-error">${err.ai_offline ? '⚠️ AI Service chưa chạy. Vui lòng khởi động: python ai_service/app.py' : escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🎯 Tìm việc phù hợp';
  }
});

const requestedCandidateView = new URLSearchParams(window.location.search).get('view');
if (requestedCandidateView && VIEW_META[requestedCandidateView]) {
  switchView(requestedCandidateView);
}
