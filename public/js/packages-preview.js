let previewSelectedPackageId = null;
let previewSelectedMethod = 'demo';
let previewPackages = [];
let previewSubscription = null;

const PLAN_COPY = {
  free: {
    audience: 'Bắt đầu',
    description: 'Dành cho doanh nghiệp mới làm quen với quy trình tuyển dụng trên JobLink.'
  },
  basic: {
    audience: 'Đội ngũ nhỏ',
    description: 'Phù hợp nhu cầu tuyển đều, cần thêm tin đăng và vị trí VIP nổi bật.'
  },
  pro: {
    audience: 'Tuyển dụng tăng trưởng',
    description: 'Mở Kho CV và chủ động tìm ứng viên cho nhiều vị trí cùng lúc.'
  },
  enterprise: {
    audience: 'Quy mô lớn',
    description: 'Quota mở rộng cho doanh nghiệp có nhu cầu tuyển dụng liên tục.'
  }
};

function resetPreviewScroll() {
  if (window.location.hash) return;
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
}

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}
window.addEventListener('pageshow', resetPreviewScroll);
resetPreviewScroll();

function formatPlanPrice(price) {
  const amount = Number(price || 0);
  if (amount === 0) return { value: '0 đ', period: 'không thời hạn' };
  const millions = amount / 1000000;
  return {
    value: `${Number.isInteger(millions) ? millions : millions.toFixed(1)} triệu`,
    period: '/ 30 ngày'
  };
}

function quotaText(value, suffix) {
  const amount = Number(value || 0);
  return amount >= 999 ? `Không giới hạn ${suffix}` : `${amount} ${suffix}`;
}

function planHighlights(pkg) {
  const highlights = [
    quotaText(pkg.max_job_posts, 'tin đăng'),
    Number(pkg.max_vip_posts) > 0
      ? quotaText(pkg.max_vip_posts, 'tin VIP')
      : 'Quản lý ứng viên theo vị trí',
    Boolean(pkg.can_search_cv)
      ? 'Tìm kiếm trong Kho CV ứng viên'
      : 'Hồ sơ doanh nghiệp công khai',
    Boolean(pkg.can_search_cv)
      ? quotaText(pkg.max_cv_views, 'lượt xem CV')
      : 'Theo dõi đơn ứng tuyển tập trung'
  ];

  if (pkg.code === 'enterprise') highlights[3] = 'Hỗ trợ ưu tiên cho doanh nghiệp';
  return highlights;
}

function currentPackageCode() {
  const user = getToken() ? getUser() : null;
  if (user?.role !== 'company') return null;
  return previewSubscription?.package_code || 'free';
}

function planActionHtml(pkg, isCurrent) {
  if (isCurrent) {
    return '<button class="btn btn-outline plan-action" type="button" disabled>Gói đang sử dụng</button>';
  }
  if (pkg.code === 'free') {
    return '<button class="btn btn-outline plan-action" type="button" disabled>Gói mặc định</button>';
  }
  return `<button class="btn ${pkg.code === 'pro' ? 'btn-primary' : 'btn-outline'} plan-action" type="button" data-buy-package="${pkg.id}">Chọn gói ${escapeHtml(pkg.name)}</button>`;
}

function planCardHtml(pkg) {
  const copy = PLAN_COPY[pkg.code] || { audience: 'Doanh nghiệp', description: pkg.description || '' };
  const isRecommended = pkg.code === 'pro';
  const isCurrent = pkg.code === currentPackageCode();
  const price = formatPlanPrice(pkg.price);
  const labels = [];
  if (isCurrent) labels.push('<span class="plan-label current-label">Hiện tại</span>');
  else if (isRecommended) labels.push('<span class="plan-label">Đề xuất</span>');

  return `
    <article class="preview-plan-card${isRecommended ? ' recommended' : ''}${isCurrent ? ' current' : ''}">
      <div class="plan-topline">
        <span class="plan-audience">${escapeHtml(copy.audience)}</span>
        ${labels.join('')}
      </div>
      <h3 class="plan-name">${escapeHtml(pkg.name)}</h3>
      <div class="plan-price-row">
        <strong class="plan-price">${escapeHtml(price.value)}</strong>
        <span class="plan-period">${escapeHtml(price.period)}</span>
      </div>
      <p class="plan-description">${escapeHtml(copy.description)}</p>
      <div class="plan-divider"></div>
      <ul class="plan-highlights">
        ${planHighlights(pkg).map((feature) => `
          <li><span class="plan-check" aria-hidden="true">✓</span><span>${escapeHtml(feature)}</span></li>
        `).join('')}
      </ul>
      ${planActionHtml(pkg, isCurrent)}
    </article>
  `;
}

function renderCurrentPlan() {
  const container = document.getElementById('current-plan');
  const user = getToken() ? getUser() : null;

  if (!user || user.role !== 'company') {
    container.innerHTML = `
      <div class="current-plan-main">
        <span class="current-plan-code">JL</span>
        <div class="current-plan-copy">
          <span>Trạng thái tài khoản</span>
          <strong>Chưa đăng nhập doanh nghiệp</strong>
          <small>Đăng nhập để xem gói hiện tại và thực hiện thanh toán.</small>
        </div>
      </div>
      <a href="/login.html" class="btn btn-outline btn-sm">Đăng nhập</a>
    `;
    return;
  }

  const activePackage = previewPackages.find((pkg) => pkg.code === currentPackageCode());
  const packageName = previewSubscription?.package_name || activePackage?.name || 'Miễn phí';
  const used = Number(previewSubscription?.job_posts_used || 0);
  const limit = Number(previewSubscription?.max_job_posts || activePackage?.max_job_posts || 3);
  const expiry = previewSubscription?.expires_at
    ? new Date(previewSubscription.expires_at).toLocaleDateString('vi-VN')
    : 'Không thời hạn';

  container.innerHTML = `
    <div class="current-plan-main">
      <span class="current-plan-code">${escapeHtml(String(packageName).slice(0, 2).toUpperCase())}</span>
      <div class="current-plan-copy">
        <span>Gói hiện tại</span>
        <strong>${escapeHtml(packageName)}</strong>
        <small>${previewSubscription ? 'Đang hoạt động' : 'Tự động áp dụng cho tài khoản doanh nghiệp'}</small>
      </div>
    </div>
    <div class="current-plan-meta">
      <div class="current-plan-metric">
        <span>Tin đăng đã dùng</span>
        <strong>${used} / ${limit >= 999 ? 'Không giới hạn' : limit}</strong>
      </div>
      <div class="current-plan-metric">
        <span>Ngày hết hạn</span>
        <strong>${escapeHtml(expiry)}</strong>
      </div>
      <a href="/company-dashboard.html?view=subscription" class="btn btn-outline btn-sm">Quản lý gói</a>
    </div>
  `;
}

function comparisonValue(pkg, key) {
  if (key === 'job_posts') return quotaText(pkg.max_job_posts, 'tin');
  if (key === 'vip_posts') return Number(pkg.max_vip_posts) > 0 ? quotaText(pkg.max_vip_posts, 'tin') : 'Không có';
  if (key === 'cv_search') return Boolean(pkg.can_search_cv) ? 'Có' : 'Không';
  if (key === 'cv_views') return Boolean(pkg.can_search_cv) ? quotaText(pkg.max_cv_views, 'lượt') : 'Không có';
  if (key === 'duration') return `${Number(pkg.duration_days || 30)} ngày`;
  if (key === 'priority') return pkg.code === 'enterprise' ? 'Có' : 'Tiêu chuẩn';
  return '';
}

function comparisonCellHtml(pkg, row) {
  const value = comparisonValue(pkg, row.key);
  const recommendedClass = pkg.code === 'pro' ? ' recommended-column' : '';
  if (row.boolean) {
    const enabled = value === 'Có';
    return `<td class="${recommendedClass.trim()}"><span class="${enabled ? 'comparison-yes' : 'comparison-no'}" aria-label="${enabled ? 'Có' : 'Không'}">${enabled ? '✓' : '—'}</span></td>`;
  }
  return `<td class="${recommendedClass.trim()}">${escapeHtml(value)}</td>`;
}

function renderComparison() {
  const rows = [
    { label: 'Tin đăng trong kỳ', key: 'job_posts' },
    { label: 'Tin VIP nổi bật', key: 'vip_posts' },
    { label: 'Truy cập Kho CV', key: 'cv_search', boolean: true },
    { label: 'Lượt xem CV', key: 'cv_views' },
    { label: 'Thời hạn sử dụng', key: 'duration' },
    { label: 'Mức hỗ trợ', key: 'priority' }
  ];

  document.getElementById('comparison-head').innerHTML = `
    <tr>
      <th>Quyền lợi</th>
      ${previewPackages.map((pkg) => `<th class="${pkg.code === 'pro' ? 'recommended-column' : ''}">${escapeHtml(pkg.name)}</th>`).join('')}
    </tr>
  `;
  document.getElementById('comparison-body').innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.label)}</td>
      ${previewPackages.map((pkg) => comparisonCellHtml(pkg, row)).join('')}
    </tr>
  `).join('');
}

async function loadPricingPreview() {
  const grid = document.getElementById('pricing-grid');
  try {
    previewPackages = await apiFetch('/payments/packages', { auth: false });
  } catch (error) {
    grid.innerHTML = `<div class="alert alert-error preview-grid-error">Không tải được danh sách gói: ${escapeHtml(error.message)}</div>`;
    document.getElementById('comparison-wrap').innerHTML = `<div class="alert alert-error mb-0">Không tải được bảng so sánh.</div>`;
    renderCurrentPlan();
    return;
  }

  const user = getToken() ? getUser() : null;
  if (user?.role === 'company') {
    try {
      previewSubscription = await apiFetch('/payments/subscription');
    } catch (error) {
      previewSubscription = null;
    }
  }

  grid.innerHTML = previewPackages.map(planCardHtml).join('');
  renderCurrentPlan();
  renderComparison();
}

function openPreviewPurchaseModal(packageId) {
  const user = getToken() ? getUser() : null;
  if (!user) {
    showToast('Vui lòng đăng nhập với tài khoản Doanh nghiệp để mua gói.', 'error');
    window.setTimeout(() => { window.location.href = '/login.html'; }, 1000);
    return;
  }
  if (user.role !== 'company') {
    showToast('Chỉ tài khoản Doanh nghiệp mới có thể mua gói dịch vụ.', 'error');
    return;
  }

  const pkg = previewPackages.find((item) => Number(item.id) === Number(packageId));
  if (!pkg) return;

  previewSelectedPackageId = pkg.id;
  previewSelectedMethod = 'demo';
  document.getElementById('modal-pkg-name').textContent = `Mua gói ${pkg.name}`;
  document.getElementById('modal-price').textContent = `${Number(pkg.price).toLocaleString('vi-VN')} đ`;
  document.getElementById('modal-duration').textContent = `Hiệu lực ${pkg.duration_days} ngày`;
  document.getElementById('bank-amount').textContent = `${Number(pkg.price).toLocaleString('vi-VN')} đồng`;
  document.getElementById('modal-alert').innerHTML = '';
  document.querySelectorAll('.payment-method').forEach((button) => {
    button.classList.toggle('selected', button.dataset.method === 'demo');
  });
  document.getElementById('bank-info-box').style.display = 'none';
  document.getElementById('purchase-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.getElementById('confirm-btn').focus();
}

function closePreviewPurchaseModal() {
  document.getElementById('purchase-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function selectPreviewMethod(button) {
  previewSelectedMethod = button.dataset.method;
  document.querySelectorAll('.payment-method').forEach((item) => {
    item.classList.toggle('selected', item === button);
  });
  document.getElementById('bank-info-box').style.display =
    ['bank_transfer', 'momo'].includes(previewSelectedMethod) ? 'block' : 'none';
}

async function confirmPreviewPurchase() {
  if (!previewSelectedPackageId) return;
  const button = document.getElementById('confirm-btn');
  const alertSlot = document.getElementById('modal-alert');
  alertSlot.innerHTML = '';
  button.disabled = true;
  button.innerHTML = '<span class="loading-spinner"></span> Đang xử lý...';

  try {
    const data = await apiFetch('/payments/purchase', {
      method: 'POST',
      body: {
        package_id: previewSelectedPackageId,
        payment_method: previewSelectedMethod
      }
    });

    closePreviewPurchaseModal();
    const completed = data.status === 'completed';
    const resultIcon = document.getElementById('result-icon');
    resultIcon.textContent = completed ? '✓' : '…';
    resultIcon.classList.toggle('pending', !completed);
    document.getElementById('result-title').textContent = completed ? 'Kích hoạt thành công' : 'Đã ghi nhận giao dịch';
    document.getElementById('result-msg').textContent = data.message;
    document.getElementById('result-tx').textContent = data.transaction_code;
    document.getElementById('result-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    if (completed) {
      try {
        previewSubscription = await apiFetch('/payments/subscription');
        document.getElementById('pricing-grid').innerHTML = previewPackages.map(planCardHtml).join('');
        renderCurrentPlan();
      } catch (error) {
        // Giao dich da thanh cong; dashboard se tai lai trang thai goi khi nguoi dung quay ve.
      }
    }
  } catch (error) {
    alertSlot.innerHTML = `<div class="alert alert-error">${escapeHtml(error.message)}</div>`;
  } finally {
    button.disabled = false;
    button.textContent = 'Xác nhận mua gói';
  }
}

function closePreviewResultModal() {
  document.getElementById('result-modal').style.display = 'none';
  document.body.style.overflow = '';
}

document.getElementById('pricing-grid').addEventListener('click', (event) => {
  const button = event.target.closest('[data-buy-package]');
  if (button) openPreviewPurchaseModal(button.dataset.buyPackage);
});

document.querySelectorAll('.payment-method').forEach((button) => {
  button.addEventListener('click', () => selectPreviewMethod(button));
});

document.querySelectorAll('[data-close-purchase]').forEach((button) => {
  button.addEventListener('click', closePreviewPurchaseModal);
});

document.getElementById('confirm-btn').addEventListener('click', confirmPreviewPurchase);
document.getElementById('close-result-btn').addEventListener('click', closePreviewResultModal);

document.getElementById('purchase-modal').addEventListener('click', (event) => {
  if (event.target === event.currentTarget) closePreviewPurchaseModal();
});

document.getElementById('result-modal').addEventListener('click', (event) => {
  if (event.target === event.currentTarget) closePreviewResultModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (document.getElementById('purchase-modal').style.display !== 'none') closePreviewPurchaseModal();
  if (document.getElementById('result-modal').style.display !== 'none') closePreviewResultModal();
});

function markPreviewPackageNav() {
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const path = new URL(link.getAttribute('href'), window.location.origin).pathname;
    link.classList.toggle('active', path === '/packages.html' || path === '/packages-preview.html');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', markPreviewPackageNav);
} else {
  markPreviewPackageNav();
}

loadPricingPreview();
