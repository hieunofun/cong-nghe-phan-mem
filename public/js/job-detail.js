// public/js/job-detail.js

function getJobIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

let currentJob = null;
let candidateProfile = null;
let isSaved = false;

function renderActionButtons() {
  const user = getUser();

  if (!user) {
    return `<a href="/login.html" class="btn btn-primary btn-block">Đăng nhập để ứng tuyển</a>`;
  }

  if (user.role !== 'candidate') {
    return `<div class="alert alert-info mb-0">Chỉ ứng viên mới có thể ứng tuyển vào tin tuyển dụng.</div>`;
  }

  if (currentJob.status !== 'active') {
    return `<div class="alert alert-info mb-0">Tin tuyển dụng này đã đóng, không thể ứng tuyển.</div>`;
  }

  return `
    <button class="btn btn-accent btn-block" id="apply-btn">Ứng tuyển ngay</button>
    <button class="btn btn-outline btn-block" style="margin-top:10px;" id="save-btn">
      ${isSaved ? '★ Đã lưu' : '☆ Lưu tin này'}
    </button>
  `;
}

function renderJob() {
  const job = currentJob;
  const initials = job.company_name.slice(0, 2).toUpperCase();

  document.title = `${job.title} — JobLink`;

  document.getElementById('job-content').innerHTML = `
    <div class="detail-layout">
      <div>
        <div class="card detail-section">
          <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
            <div class="job-logo" style="width:62px;height:62px;font-size:1.3rem;">
              ${job.logo_url ? `<img src="${job.logo_url}" alt="${escapeHtml(job.company_name)}">` : initials}
            </div>
            <div style="flex:1; min-width:200px;">
              <h2 style="margin-bottom:6px;">${escapeHtml(job.title)}</h2>
              <p class="company-name" style="margin-bottom:10px; font-size:1rem;">${escapeHtml(job.company_name)}</p>
              <div class="job-meta">
                <span>📍 ${escapeHtml(job.location || 'Đang cập nhật')}</span>
                <span>🕒 ${JOB_TYPE_LABELS[job.job_type] || job.job_type}</span>
                ${job.category_name ? `<span>🏷️ ${escapeHtml(job.category_name)}</span>` : ''}
                <span>👁️ ${job.views} lượt xem</span>
              </div>
            </div>
            <div class="job-salary" style="font-size:1.2rem;">${formatSalary(job.salary_min, job.salary_max, job.salary_negotiable)}</div>
          </div>
        </div>

        <div class="card detail-section">
          <h3>Mô tả công việc</h3>
          <div class="body-text">${escapeHtml(job.description)}</div>
        </div>

        ${job.requirements ? `
        <div class="card detail-section">
          <h3>Yêu cầu ứng viên</h3>
          <div class="body-text">${escapeHtml(job.requirements)}</div>
        </div>` : ''}

        ${job.benefits ? `
        <div class="card detail-section">
          <h3>Quyền lợi</h3>
          <div class="body-text">${escapeHtml(job.benefits)}</div>
        </div>` : ''}
      </div>

      <aside class="sticky-side">
        <div class="card detail-section" id="action-card">
          ${renderActionButtons()}
          <div style="margin-top:16px; font-size:0.85rem; color:var(--ink-faint);">
            <div style="margin-bottom:6px;">👥 Tuyển ${job.vacancies || 1} người</div>
            ${job.experience_level ? `<div style="margin-bottom:6px;">📈 Kinh nghiệm: ${escapeHtml(job.experience_level)}</div>` : ''}
            ${job.deadline ? `<div>📅 Hạn nộp: ${new Date(job.deadline).toLocaleDateString('vi-VN')}</div>` : ''}
          </div>
        </div>

        <div class="card detail-section">
          <h3 style="font-size:0.95rem;">Về công ty</h3>
          <p style="font-weight:600; color:var(--ink); margin-bottom:6px;">${escapeHtml(job.company_name)}</p>
          ${job.company_address ? `<p style="font-size:0.85rem; margin-bottom:6px;">📍 ${escapeHtml(job.company_address)}</p>` : ''}
          ${job.company_description ? `<p style="font-size:0.85rem;">${escapeHtml(job.company_description)}</p>` : ''}
        </div>
      </aside>
    </div>
  `;

  attachActionHandlers();
}

async function loadMatchScore(jobId) {
  const user = getUser();
  if (!user || user.role !== 'candidate') return;
  const actionCard = document.getElementById('action-card');
  if (!actionCard) return;

  const scoreDiv = document.createElement('div');
  scoreDiv.id = 'ai-match-score';
  scoreDiv.style.cssText = 'margin-top:14px; padding-top:14px; border-top:1px solid var(--border);';
  scoreDiv.innerHTML = '<div style="font-size:0.78rem; color:var(--ink-faint); margin-bottom:6px;">🤖 AI đang tính điểm phù hợp...</div>';
  actionCard.appendChild(scoreDiv);

  try {
    const data = await apiFetch('/ai/match/' + jobId);
    const color = data.score >= 70 ? 'var(--success)' : data.score >= 45 ? 'var(--warning)' : 'var(--ink-faint)';
    scoreDiv.innerHTML = `
      <div style="font-size:0.78rem; color:var(--ink-faint); margin-bottom:6px;">🤖 Độ phù hợp với CV của bạn</div>
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="font-family:var(--font-mono); font-size:1.6rem; font-weight:800; color:${color};">${data.score}%</div>
        <div>
          <div style="font-weight:600; font-size:0.88rem; color:${color};">${data.label}</div>
          <div style="background:var(--surface-alt); border-radius:100px; height:6px; width:120px; overflow:hidden; margin-top:4px;">
            <div style="background:${color}; height:100%; border-radius:100px; width:${data.score}%;"></div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    scoreDiv.innerHTML = err.status === 400
      ? '<div style="font-size:0.78rem; color:var(--ink-faint);">💡 Cập nhật hồ sơ để xem điểm phù hợp</div>'
      : '';
  }
}

function attachActionHandlers() {
  const applyBtn = document.getElementById('apply-btn');
  if (applyBtn) applyBtn.addEventListener('click', openApplyModal);

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) saveBtn.addEventListener('click', toggleSaveJob);
}

async function toggleSaveJob() {
  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  try {
    if (isSaved) {
      await apiFetch(`/candidates/me/saved-jobs/${currentJob.id}`, { method: 'DELETE' });
      isSaved = false;
      showToast('Đã bỏ lưu tin tuyển dụng.', 'success');
    } else {
      await apiFetch(`/candidates/me/saved-jobs/${currentJob.id}`, { method: 'POST' });
      isSaved = true;
      showToast('Đã lưu tin tuyển dụng!', 'success');
    }
    btn.innerHTML = isSaved ? '★ Đã lưu' : '☆ Lưu tin này';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

function openApplyModal() {
  const hasCv = candidateProfile && candidateProfile.cv_url;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-head">
        <h3 class="mb-0">Ứng tuyển: ${escapeHtml(currentJob.title)}</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <div id="modal-alert-slot"></div>
      <form id="apply-form">
        <div class="form-group">
          <label>Thư giới thiệu (không bắt buộc)</label>
          <textarea class="input" id="cover-letter" placeholder="Giới thiệu ngắn về bản thân và lý do bạn phù hợp với vị trí này..."></textarea>
        </div>
        <div class="form-group">
          <label>CV ứng tuyển</label>
          ${hasCv ? `<div class="alert alert-info">Sẽ dùng CV hiện có trong hồ sơ của bạn. Bạn có thể chọn file khác bên dưới nếu muốn dùng CV mới.</div>` : `<div class="alert alert-error">Bạn chưa có CV trong hồ sơ — vui lòng tải lên CV để ứng tuyển.</div>`}
          <input type="file" id="cv-file" class="input" accept=".pdf,.doc,.docx">
          <p class="form-hint">Chấp nhận file .pdf, .doc, .docx — tối đa 5MB.</p>
        </div>
        <button type="submit" class="btn btn-accent btn-block" id="apply-submit-btn">Gửi hồ sơ ứng tuyển</button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('modal-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('apply-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('apply-submit-btn');
    const alertSlot = document.getElementById('modal-alert-slot');
    alertSlot.innerHTML = '';

    const fileInput = document.getElementById('cv-file');
    if (!hasCv && fileInput.files.length === 0) {
      alertSlot.innerHTML = `<div class="alert alert-error">Vui lòng chọn file CV trước khi gửi.</div>`;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="loading-spinner"></span> Đang gửi...`;

    try {
      const formData = new FormData();
      formData.append('cover_letter', document.getElementById('cover-letter').value.trim());
      if (fileInput.files.length > 0) formData.append('cv', fileInput.files[0]);

      await apiUpload(`/applications/${currentJob.id}`, formData);
      overlay.remove();
      showToast('Ứng tuyển thành công! Bạn có thể theo dõi trạng thái trong "Hồ sơ của tôi".', 'success');

      const applyBtn = document.getElementById('apply-btn');
      if (applyBtn) {
        applyBtn.outerHTML = `<div class="alert alert-success mb-0">✓ Bạn đã ứng tuyển vào tin này</div>`;
      }
    } catch (err) {
      alertSlot.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Gửi hồ sơ ứng tuyển';
    }
  });
}

async function init() {
  const jobId = getJobIdFromUrl();
  if (!jobId) {
    document.getElementById('job-content').innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Không tìm thấy tin tuyển dụng.</p></div>`;
    return;
  }

  try {
    currentJob = await apiFetch(`/jobs/${jobId}`, { auth: false });

    const user = getUser();
    if (user && user.role === 'candidate') {
      try {
        candidateProfile = await apiFetch('/candidates/me');
        const savedJobs = await apiFetch('/candidates/me/saved-jobs');
        isSaved = savedJobs.some((j) => j.id === currentJob.id);
      } catch (e) { /* khong chan render chinh neu loi phu */ }
    }

    renderJob();
    // Tai diem phu hop AI sau khi render xong
    loadMatchScore(currentJob.id);
  } catch (err) {
    document.getElementById('job-content').innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Không tìm thấy tin tuyển dụng hoặc tin đã bị gỡ.</p></div>`;
  }
}

init();
