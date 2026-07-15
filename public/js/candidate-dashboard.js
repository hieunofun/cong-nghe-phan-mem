// public/js/candidate-dashboard.js

const user = requireAuth(['candidate']);

const VIEW_META = {
  profile: { title: 'Hồ sơ của tôi', subtitle: 'Cập nhật thông tin để nhà tuyển dụng hiểu rõ hơn về bạn.' },
  applications: { title: 'Đơn đã ứng tuyển', subtitle: 'Theo dõi trạng thái xử lý hồ sơ ứng tuyển của bạn.' },
  saved: { title: 'Tin đã lưu', subtitle: 'Danh sách công việc bạn đã đánh dấu để xem lại sau.' }
};

function switchView(view) {
  document.querySelectorAll('.dash-nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === view));
  document.querySelectorAll('.dash-view').forEach((el) => { el.style.display = el.id === `view-${view}` ? 'block' : 'none'; });
  document.getElementById('view-title').textContent = VIEW_META[view].title;
  document.getElementById('view-subtitle').textContent = VIEW_META[view].subtitle;
}

document.querySelectorAll('.dash-nav a').forEach((a) => {
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
  try {
    const formData = new FormData();
    formData.append('cv', file);
    const data = await apiUpload('/candidates/me/cv', formData);
    document.getElementById('cv-preview').textContent = '✓ CV';
    const cvLink = document.getElementById('cv-view-link');
    cvLink.href = data.cv_url;
    cvLink.style.display = 'inline-flex';
    showToast('Đã tải lên CV thành công!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function statusBadge(status) {
  return `<span class="badge badge-${status}">${STATUS_LABELS[status] || status}</span>`;
}

async function loadApplications() {
  const tbody = document.querySelector('#applications-table tbody');
  const emptyEl = document.getElementById('applications-empty');
  try {
    const apps = await apiFetch('/candidates/me/applications');
    if (apps.length === 0) {
      document.getElementById('applications-table').style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }
    tbody.innerHTML = apps.map((a) => `
      <tr>
        <td><a href="/job-detail.html?id=${a.job_id}">${escapeHtml(a.job_title)}</a></td>
        <td>${escapeHtml(a.company_name)}</td>
        <td>${new Date(a.applied_at).toLocaleDateString('vi-VN')}</td>
        <td>${statusBadge(a.status)}</td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Không tải được danh sách ứng tuyển: ' + err.message, 'error');
  }
}

function savedJobCardHtml(job) {
  const initials = job.company_name.slice(0, 2).toUpperCase();
  return `
    <div class="job-card">
      <a href="/job-detail.html?id=${job.id}" style="text-decoration:none; color:inherit;">
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
        <span class="job-salary">${formatSalary(job.salary_min, job.salary_max, job.salary_negotiable)}</span>
        <button class="btn btn-ghost btn-sm" onclick="unsaveJob(${job.id})">Bỏ lưu</button>
      </div>
    </div>
  `;
}

async function loadSavedJobs() {
  const grid = document.getElementById('saved-grid');
  const emptyEl = document.getElementById('saved-empty');
  try {
    const jobs = await apiFetch('/candidates/me/saved-jobs');
    if (jobs.length === 0) {
      grid.style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }
    grid.style.display = 'grid';
    emptyEl.style.display = 'none';
    grid.innerHTML = jobs.map(savedJobCardHtml).join('');
  } catch (err) {
    showToast('Không tải được tin đã lưu: ' + err.message, 'error');
  }
}

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
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div class="card">
        <h3 style="font-size:0.95rem; margin-bottom:14px;">📊 Kết quả phân tích</h3>
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
      recEl.innerHTML = recs.map(r => {
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
      }).join('');
    }
    showToast(`Tìm được ${recs.length} việc phù hợp!`, 'success');
  } catch (err) {
    recEl.innerHTML = `<div class="alert alert-error">${err.ai_offline ? '⚠️ AI Service chưa chạy. Vui lòng khởi động: python ai_service/app.py' : escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🎯 Tìm việc phù hợp';
  }
});
