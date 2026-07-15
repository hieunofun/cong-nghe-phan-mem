// public/js/home.js

function jobCardHtml(job) {
  const initials = job.company_name.slice(0, 2).toUpperCase();
  return `
    <a href="/job-detail.html?id=${job.id}" class="job-card">
      ${job.is_vip ? '<div style="display:flex; justify-content:flex-end; margin-bottom:6px;"><span class="badge" style="background:#FEF3C7; color:#92400E; font-size:0.7rem;">⭐ VIP</span></div>' : ''}
      <div class="job-card-top">
        <div class="job-logo">${job.logo_url ? `<img src="${job.logo_url}" alt="${escapeHtml(job.company_name)}">` : initials}</div>
        <div>
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

async function loadFeaturedJobs() {
  const grid = document.getElementById('featured-jobs-grid');
  try {
    const jobs = await apiFetch('/jobs/featured', { auth: false });
    if (jobs.length === 0) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🗂️</div><p>Chưa có tin tuyển dụng nào.</p></div>`;
      return;
    }
    grid.innerHTML = jobs.map(jobCardHtml).join('');
  } catch (err) {
    grid.innerHTML = `<div class="alert alert-error">Không tải được danh sách việc làm: ${escapeHtml(err.message)}</div>`;
  }
}

async function loadCategories() {
  const grid = document.getElementById('category-grid');
  const chipRow = document.getElementById('hero-chip-row');
  try {
    const categories = await apiFetch('/categories', { auth: false });

    grid.innerHTML = categories.map((c) => `
      <a href="/jobs.html?category_id=${c.id}" class="card" style="text-align:center;">
        <strong style="font-family:var(--font-display);">${escapeHtml(c.name)}</strong>
      </a>
    `).join('');

    chipRow.innerHTML = categories.slice(0, 5).map((c) =>
      `<a href="/jobs.html?category_id=${c.id}" class="chip">${escapeHtml(c.name)}</a>`
    ).join('');
  } catch (err) {
    grid.innerHTML = `<div class="alert alert-error">Không tải được danh mục ngành nghề.</div>`;
    chipRow.innerHTML = '';
  }
}

function buildTicker() {
  const track = document.getElementById('ticker-track');
  const items = [
    '🚀 1.240+ việc đang tuyển hôm nay',
    '🏢 320+ doanh nghiệp đã xác thực',
    '🎯 8 ngành nghề chính',
    '⚡ Ứng tuyển chỉ với 1 lần click',
    '📄 Quản lý CV tập trung, không thất lạc hồ sơ'
  ];
  const doubled = [...items, ...items];
  track.innerHTML = doubled.map((t) => `<span>${t}</span>`).join('');
}

document.getElementById('hero-search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const keyword = document.getElementById('hero-keyword').value.trim();
  const location = document.getElementById('hero-location').value.trim();
  const params = new URLSearchParams();
  if (keyword) params.set('keyword', keyword);
  if (location) params.set('location', location);
  window.location.href = `/jobs.html?${params.toString()}`;
});

buildTicker();
loadFeaturedJobs();
loadCategories();
