// public/js/jobs.js

const PAGE_LIMIT = 8;

function getParams() {
  return new URLSearchParams(window.location.search);
}

function jobRowHtml(job) {
  const initials = job.company_name.slice(0, 2).toUpperCase();
  return `
    <a href="/job-detail.html?id=${job.id}" class="job-card job-row">
      ${job.is_vip ? '<div style="display:flex; margin-bottom:4px;"><span class="badge" style="background:#FEF3C7; color:#92400E; font-size:0.7rem;">⭐ VIP – Nổi bật</span></div>' : ''}
      <div class="job-card-top">
        <div class="job-logo">${job.logo_url ? `<img src="${job.logo_url}" alt="${escapeHtml(job.company_name)}">` : initials}</div>
        <div>
          <h3>${escapeHtml(job.title)}</h3>
          <p class="company-name">${escapeHtml(job.company_name)}</p>
          <div class="job-meta">
            <span>📍 ${escapeHtml(job.location || 'Đang cập nhật')}</span>
            <span>🕒 ${JOB_TYPE_LABELS[job.job_type] || job.job_type}</span>
            ${job.category_name ? `<span>🏷️ ${escapeHtml(job.category_name)}</span>` : ''}
          </div>
        </div>
      </div>
      <div style="text-align:right; flex-shrink:0;">
        <div class="job-salary">${formatSalary(job.salary_min, job.salary_max, job.salary_negotiable)}</div>
        <div class="form-hint">${timeAgo(job.created_at)}</div>
      </div>
    </a>
  `;
}

async function populateCategoryFilter() {
  const select = document.getElementById('filter-category');
  try {
    const categories = await apiFetch('/categories', { auth: false });
    const current = getParams().get('category_id') || '';
    categories.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      if (String(c.id) === current) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (err) { /* bo qua, danh sach mac dinh van dung duoc */ }
}

function fillFiltersFromUrl() {
  const params = getParams();
  document.getElementById('search-keyword').value = params.get('keyword') || '';
  document.getElementById('search-location').value = params.get('location') || '';
  document.getElementById('filter-job-type').value = params.get('job_type') || '';
  document.getElementById('filter-salary').value = params.get('salary_min') || '';
}

async function loadJobs() {
  const listEl = document.getElementById('job-list');
  const countEl = document.getElementById('results-count');
  const params = getParams();
  const page = Number(params.get('page')) || 1;

  const query = new URLSearchParams();
  ['keyword', 'location', 'category_id', 'job_type', 'salary_min'].forEach((key) => {
    if (params.get(key)) query.set(key, params.get(key));
  });
  query.set('page', page);
  query.set('limit', PAGE_LIMIT);

  try {
    const data = await apiFetch(`/jobs?${query.toString()}`, { auth: false });
    countEl.textContent = `Tìm thấy ${data.total} việc làm phù hợp`;

    if (data.jobs.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>Không tìm thấy việc làm phù hợp với tiêu chí của bạn.</p></div>`;
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    listEl.innerHTML = data.jobs.map(jobRowHtml).join('');
    renderPagination(data.page, data.totalPages);
  } catch (err) {
    listEl.innerHTML = `<div class="alert alert-error">Không tải được danh sách việc làm: ${escapeHtml(err.message)}</div>`;
  }
}

function renderPagination(current, totalPages) {
  const el = document.getElementById('pagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  let html = `<button ${current <= 1 ? 'disabled' : ''} data-page="${current - 1}">‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - current) <= 1) {
      html += `<button class="${p === current ? 'active' : ''}" data-page="${p}">${p}</button>`;
    } else if (p === 2 || p === totalPages - 1) {
      html += `<span style="padding-top:8px;">…</span>`;
    }
  }
  html += `<button ${current >= totalPages ? 'disabled' : ''} data-page="${current + 1}">›</button>`;
  el.innerHTML = html;

  el.querySelectorAll('button[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const params = getParams();
      params.set('page', btn.dataset.page);
      window.location.search = params.toString();
    });
  });
}

function updateUrlAndReload(updates) {
  const params = getParams();
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value); else params.delete(key);
  });
  params.delete('page');
  window.location.search = params.toString();
}

document.getElementById('search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  updateUrlAndReload({
    keyword: document.getElementById('search-keyword').value.trim(),
    location: document.getElementById('search-location').value.trim()
  });
});

document.getElementById('apply-filters-btn').addEventListener('click', () => {
  updateUrlAndReload({
    category_id: document.getElementById('filter-category').value,
    job_type: document.getElementById('filter-job-type').value,
    salary_min: document.getElementById('filter-salary').value
  });
});

document.getElementById('clear-filters-btn').addEventListener('click', () => {
  window.location.href = '/jobs.html';
});

fillFiltersFromUrl();
populateCategoryFilter();
loadJobs();
