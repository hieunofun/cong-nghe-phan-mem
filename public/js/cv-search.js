// public/js/cv-search.js

requireAuth(['company']);

let currentPage = 1;
let cvViewsUsed = 0;
let cvViewsLimit = 0;

async function checkAccess() {
  const accessEl = document.getElementById('access-check');
  const searchEl = document.getElementById('search-area');
  try {
    const sub = await apiFetch('/payments/subscription');
    if (!sub || !sub.can_search_cv) {
      accessEl.innerHTML = `
        <div class="upgrade-wall">
          <div class="icon">🔒</div>
          <h2>Tính năng Kho CV</h2>
          <p style="max-width:420px; margin:0 auto 24px;">Tính năng này chỉ dành cho gói <strong>Pro</strong> và <strong>Enterprise</strong>. Nâng cấp ngay để tìm kiếm hồ sơ ứng viên chủ động.</p>
          <a href="/packages.html" class="btn btn-primary">Xem các gói dịch vụ →</a>
        </div>
      `;
      return;
    }

    cvViewsUsed = sub.cv_views_used;
    cvViewsLimit = sub.max_cv_views;
    updateQuotaBar();

    accessEl.style.display = 'none';
    searchEl.style.display = 'block';
    searchCandidates(1);
  } catch (err) {
    accessEl.innerHTML = `<div class="alert alert-error">Không kiểm tra được quyền truy cập: ${escapeHtml(err.message)}</div>`;
  }
}

function updateQuotaBar() {
  const pct = cvViewsLimit >= 999 ? 5 : Math.min(100, (cvViewsUsed / cvViewsLimit) * 100);
  document.getElementById('quota-bar').style.width = pct + '%';
  document.getElementById('quota-text').textContent = cvViewsLimit >= 999
    ? `Đã xem ${cvViewsUsed} CV (không giới hạn)`
    : `${cvViewsUsed} / ${cvViewsLimit} CV đã xem`;
  if (pct >= 80) document.getElementById('quota-bar').style.background = 'var(--warning)';
  if (pct >= 100) document.getElementById('quota-bar').style.background = 'var(--danger)';
}

function candidateCardHtml(c) {
  const initial = (c.full_name || '?')[0].toUpperCase();
  return `
    <div class="cv-card" onclick="viewCandidateDetail(${c.id}, '${escapeHtml(c.full_name)}')">
      <div style="display:flex; gap:14px; align-items:center; margin-bottom:14px;">
        <div class="cv-avatar">
          ${c.avatar_url ? `<img src="${c.avatar_url}" alt="">` : initial}
        </div>
        <div>
          <div style="font-weight:700; font-size:1rem;">${escapeHtml(c.full_name)}</div>
          <div style="font-size:0.8rem; color:var(--ink-faint);">${escapeHtml(c.address || 'Chưa cập nhật địa điểm')}</div>
        </div>
      </div>
      ${c.skills ? `
        <div style="margin-bottom:10px;">
          <div style="font-size:0.75rem; font-weight:600; color:var(--ink-faint); text-transform:uppercase; letter-spacing:.03em; margin-bottom:6px;">Kỹ năng</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${c.skills.split(',').slice(0,5).map(s => `<span class="badge badge-reviewing">${escapeHtml(s.trim())}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      ${c.experience ? `<p style="font-size:0.82rem; color:var(--ink-soft); margin:0;">${escapeHtml(c.experience.slice(0, 90))}${c.experience.length > 90 ? '...' : ''}</p>` : ''}
      <div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.75rem; color:var(--ink-faint);">Tham gia ${timeAgo(c.created_at)}</span>
        <span class="btn btn-outline btn-sm" style="pointer-events:none;">Xem hồ sơ</span>
      </div>
    </div>
  `;
}

async function searchCandidates(page = 1) {
  currentPage = page;
  const resultsEl = document.getElementById('cv-results');
  const keyword = document.getElementById('cv-keyword').value.trim();
  const location = document.getElementById('cv-location').value.trim();

  resultsEl.innerHTML = `<div class="cv-grid">
    ${[1,2,3,4,5,6].map(() => `<div class="card skeleton" style="height:180px;"></div>`).join('')}
  </div>`;

  try {
    const params = new URLSearchParams({ page, limit: 9 });
    if (keyword) params.set('keyword', keyword);
    if (location) params.set('location', location);

    const data = await apiFetch(`/cv-search?${params.toString()}`);

    if (data.candidates.length === 0) {
      resultsEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>Không tìm thấy ứng viên phù hợp với từ khoá này.</p></div>`;
      document.getElementById('cv-pagination').innerHTML = '';
      return;
    }

    resultsEl.innerHTML = `
      <p class="form-hint" style="margin-bottom:14px;">Tìm thấy <strong>${data.total}</strong> ứng viên — Bấm vào hồ sơ để xem thông tin liên hệ (mỗi lần xem tốn 1 lượt trong quota)</p>
      <div class="cv-grid">${data.candidates.map(candidateCardHtml).join('')}</div>
    `;

    renderCvPagination(data.page, data.totalPages);
  } catch (err) {
    if (err.status === 403) {
      resultsEl.innerHTML = `
        <div class="upgrade-wall">
          <div class="icon">🔒</div>
          <h3>${escapeHtml(err.message)}</h3>
          <a href="/packages.html" class="btn btn-primary" style="margin-top:16px;">Nâng cấp gói</a>
        </div>
      `;
    } else {
      resultsEl.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  }
}

function renderCvPagination(current, totalPages) {
  const el = document.getElementById('cv-pagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  let html = `<button ${current <= 1 ? 'disabled' : ''} onclick="searchCandidates(${current - 1})">‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - current) <= 1) {
      html += `<button class="${p === current ? 'active' : ''}" onclick="searchCandidates(${p})">${p}</button>`;
    } else if (p === 2 || p === totalPages - 1) {
      html += `<span style="padding-top:8px;">…</span>`;
    }
  }
  html += `<button ${current >= totalPages ? 'disabled' : ''} onclick="searchCandidates(${current + 1})">›</button>`;
  el.innerHTML = html;
}

async function viewCandidateDetail(id, name) {
  const modal = document.getElementById('cv-modal');
  const content = document.getElementById('cv-modal-content');
  document.getElementById('cv-modal-name').textContent = name;
  content.innerHTML = `<div style="text-align:center; padding:32px;"><span class="loading-spinner" style="width:28px;height:28px;border-color:rgba(0,0,0,.2);border-top-color:var(--primary);"></span></div>`;
  modal.style.display = 'flex';

  try {
    const { candidate: c, cv_views_used, cv_views_limit } = await apiFetch(`/cv-search/${id}`);

    cvViewsUsed = cv_views_used;
    cvViewsLimit = cv_views_limit;
    updateQuotaBar();

    content.innerHTML = `
      <div style="display:flex; gap:16px; align-items:center; margin-bottom:22px; padding-bottom:18px; border-bottom:1px solid var(--border);">
        <div class="cv-avatar" style="width:60px;height:60px;font-size:1.3rem;">
          ${c.avatar_url ? `<img src="${c.avatar_url}" alt="">` : (c.full_name || '?')[0].toUpperCase()}
        </div>
        <div>
          <div style="font-size:1.2rem; font-weight:700;">${escapeHtml(c.full_name)}</div>
          <div style="color:var(--ink-faint); font-size:0.85rem;">${escapeHtml(c.address || 'Chưa cập nhật địa điểm')}</div>
        </div>
      </div>

      <div class="form-row" style="margin-bottom:14px;">
        <div>
          <div class="form-hint mb-0">Email</div>
          <a href="mailto:${escapeHtml(c.email)}" style="font-weight:600;">${escapeHtml(c.email)}</a>
        </div>
        <div>
          <div class="form-hint mb-0">Số điện thoại</div>
          <a href="tel:${escapeHtml(c.phone || '')}" style="font-weight:600;">${escapeHtml(c.phone || 'Chưa cập nhật')}</a>
        </div>
      </div>

      ${c.skills ? `<div style="margin-bottom:14px;"><div class="form-hint mb-0" style="margin-bottom:6px;">Kỹ năng</div><p>${escapeHtml(c.skills)}</p></div>` : ''}
      ${c.experience ? `<div style="margin-bottom:14px;"><div class="form-hint mb-0" style="margin-bottom:6px;">Kinh nghiệm</div><p style="white-space:pre-line;">${escapeHtml(c.experience)}</p></div>` : ''}
      ${c.education ? `<div style="margin-bottom:14px;"><div class="form-hint mb-0" style="margin-bottom:6px;">Học vấn</div><p>${escapeHtml(c.education)}</p></div>` : ''}
      ${c.cv_url ? `<a href="${c.cv_url}" target="_blank" class="btn btn-primary btn-block">📄 Tải CV về máy</a>` : '<p class="form-hint text-center">Ứng viên chưa tải lên file CV.</p>'}
    `;
  } catch (err) {
    content.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

// Cho phep nhan Enter de tim kiem
document.getElementById('cv-keyword').addEventListener('keypress', e => { if (e.key === 'Enter') searchCandidates(1); });
document.getElementById('cv-location').addEventListener('keypress', e => { if (e.key === 'Enter') searchCandidates(1); });

document.getElementById('cv-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('cv-modal')) document.getElementById('cv-modal').style.display = 'none';
});

checkAccess();
