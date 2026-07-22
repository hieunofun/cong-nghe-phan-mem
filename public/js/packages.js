// public/js/packages.js

let selectedPackageId = null;
let activePaymentId = null;
let paymentPollTimer = null;
let packagesData = [];
let currentPackageCode = null;
let checkoutConfig = null;

function resetPackagesScroll() {
  if (window.location.hash || new URLSearchParams(window.location.search).has('payment')) return;
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
}

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}
window.addEventListener('pageshow', resetPackagesScroll);
resetPackagesScroll();

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

function formatCompactPrice(price) {
  if (price === 0) return '0 đ';
  const millions = price / 1000000;
  return `${millions.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`;
}

function featureCopy(pkg) {
  const hasCvAccess = Boolean(pkg.can_search_cv);
  return [
    {
      text: pkg.max_job_posts >= 999 ? 'Không giới hạn tin đăng/tháng' : `${pkg.max_job_posts} tin đăng/tháng`,
      ok: true
    },
    {
      text: pkg.max_vip_posts > 0
        ? (pkg.max_vip_posts >= 999 ? 'Không giới hạn tin VIP nổi bật' : `${pkg.max_vip_posts} tin VIP nổi bật`)
        : 'Không có tin VIP nổi bật',
      ok: pkg.max_vip_posts > 0
    },
    {
      text: hasCvAccess ? 'Tìm kiếm Kho CV ứng viên' : 'Không có quyền truy cập Kho CV',
      ok: hasCvAccess
    },
    {
      text: hasCvAccess
        ? (pkg.max_cv_views >= 999 ? 'Xem CV không giới hạn' : `${pkg.max_cv_views} lượt xem CV/tháng`)
        : 'Không có lượt xem CV',
      ok: hasCvAccess
    },
    {
      text: pkg.code === 'free' ? 'Không có hồ sơ công ty nổi bật' : 'Hồ sơ công ty nổi bật',
      ok: pkg.code !== 'free'
    },
    {
      text: pkg.code === 'enterprise' ? 'Hỗ trợ ưu tiên' : 'Không có hỗ trợ ưu tiên',
      ok: pkg.code === 'enterprise'
    }
  ];
}

function packageActionHtml(pkg, isPopular) {
  const isCurrent = pkg.code === currentPackageCode;
  const user = getUser();

  if (isCurrent) {
    return '<div class="pricing-action pricing-current" aria-label="Đây là gói hiện tại">Gói hiện tại</div>';
  }

  if (pkg.code === 'free') {
    if (user?.role === 'company') {
      return '<div class="pricing-action pricing-current">Gói mặc định</div>';
    }
    return '<a class="btn btn-outline btn-block pricing-action" href="/register.html?role=company">Bắt đầu miễn phí</a>';
  }

  return `<button class="btn ${isPopular ? 'btn-primary' : 'btn-outline'} btn-block pricing-action" onclick="openPurchaseModal(${pkg.id})">Chọn ${escapeHtml(pkg.name)}</button>`;
}

function packageCardHtml(pkg) {
  const isPopular = pkg.code === 'pro';
  const features = featureCopy(pkg);

  return `
    <article class="pricing-card ${isPopular ? 'popular' : ''}" aria-label="Gói ${escapeHtml(pkg.name)}">
      ${isPopular ? '<div class="popular-badge">Phổ biến nhất</div>' : ''}
      <div>
        <div class="plan-name">${escapeHtml(pkg.name)}</div>
        <div class="price-tag">${formatCompactPrice(pkg.price)}<span>/tháng</span></div>
      </div>
      <p class="plan-description">${escapeHtml(pkg.description)}</p>
      <ul class="feature-list">
        ${features.map(f => `<li class="${f.ok ? '' : 'no'}">${f.text}</li>`).join('')}
      </ul>
      ${packageActionHtml(pkg, isPopular)}
    </article>
  `;
}

async function loadPackages() {
  const grid = document.getElementById('pricing-grid');
  try {
    const user = getUser();
    const isAuthenticatedCompany = user?.role === 'company' && Boolean(getToken());
    const subscriptionRequest = isAuthenticatedCompany
      ? apiFetch('/payments/subscription').catch(() => null)
      : Promise.resolve(null);

    const [packages, config, subscription] = await Promise.all([
      apiFetch('/payments/packages', { auth: false }),
      apiFetch('/payments/checkout-config', { auth: false }),
      subscriptionRequest
    ]);

    packagesData = packages;
    checkoutConfig = config;
    currentPackageCode = isAuthenticatedCompany
      ? (subscription?.package_code || 'free')
      : null;
    grid.innerHTML = packagesData.map(packageCardHtml).join('');

    if (isAuthenticatedCompany) {
      await restorePaymentFromUrl();
    }
  } catch (err) {
    grid.innerHTML = `<div class="alert alert-error">Không tải được danh sách gói: ${escapeHtml(err.message)}</div>`;
  }
}

function requireCompanyAccount() {
  const user = getUser();
  if (!user || !getToken()) {
    showToast('Vui lòng đăng nhập với tài khoản Doanh nghiệp để mua gói.', 'error');
    setTimeout(() => { window.location.href = '/login.html'; }, 1200);
    return false;
  }
  if (user.role !== 'company') {
    showToast('Chỉ tài khoản Doanh nghiệp mới có thể mua gói dịch vụ.', 'error');
    return false;
  }
  return true;
}

function setCheckoutStage(stage) {
  document.getElementById('checkout-review').hidden = stage !== 'review';
  document.getElementById('checkout-payment').hidden = stage !== 'payment';
}

function showPurchaseModal() {
  const modal = document.getElementById('purchase-modal');
  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
  modal.querySelector('.modal-close')?.focus();
}

function openPurchaseModal(pkgId) {
  if (!requireCompanyAccount()) return;

  selectedPackageId = Number(pkgId);
  activePaymentId = null;
  stopPaymentPolling();

  const pkg = packagesData.find(item => Number(item.id) === selectedPackageId);
  if (!pkg) return;

  document.getElementById('modal-pkg-name').textContent = `Thanh toán gói ${pkg.name}`;
  document.getElementById('checkout-package-name').textContent = `Gói ${pkg.name}`;
  document.getElementById('modal-price').textContent = formatMoney(pkg.price);
  document.getElementById('modal-duration').textContent = `${pkg.duration_days} ngày`;
  document.getElementById('modal-alert').innerHTML = '';

  const terms = document.getElementById('checkout-terms');
  terms.checked = false;
  document.getElementById('confirm-btn').disabled = true;
  setCheckoutStage('review');
  showPurchaseModal();
}

function closePurchaseModal() {
  document.getElementById('purchase-modal').style.display = 'none';
  document.body.classList.remove('modal-open');
  stopPaymentPolling();
}

function statusMeta(status) {
  const values = {
    pending: { label: '● Đang chờ thanh toán', className: '', icon: '' },
    completed: { label: '✓ Đã xác nhận thanh toán', className: 'completed', icon: '✓' },
    failed: { label: '× Thanh toán không thành công', className: 'failed', icon: '!' },
    expired: { label: '× Đơn đã hết hạn', className: 'expired', icon: '!' }
  };
  return values[status] || values.pending;
}

function renderPaymentInstructions(data) {
  const meta = statusMeta(data.status);
  activePaymentId = Number(data.payment_id);
  selectedPackageId = Number(data.package?.id || selectedPackageId);

  document.getElementById('modal-pkg-name').textContent = data.package?.name
    ? `Thanh toán gói ${data.package.name}`
    : 'Chi tiết thanh toán';
  document.getElementById('modal-alert').innerHTML = data.reused
    ? '<div class="alert alert-info">Đã mở lại đơn đang chờ thanh toán của bạn.</div>'
    : '';

  const chip = document.getElementById('payment-status-chip');
  chip.className = `payment-status-chip ${meta.className}`.trim();
  chip.textContent = meta.label;
  document.getElementById('payment-order-code').textContent = `Mã đơn ${data.transaction_code}`;

  const qr = document.getElementById('payment-qr');
  const stateIcon = document.getElementById('payment-state-icon');
  const transferCard = document.getElementById('payment-transfer-card');
  const transferNote = document.getElementById('payment-transfer-note');
  const caption = document.querySelector('.qr-caption');

  if (data.status === 'pending' && data.bank_info) {
    const bank = data.bank_info;
    qr.hidden = false;
    qr.src = bank.qr_url;
    stateIcon.hidden = true;
    transferCard.hidden = false;
    transferNote.hidden = false;
    caption.textContent = 'Mở ứng dụng ngân hàng và quét mã. Số tiền cùng nội dung chuyển khoản đã được điền sẵn.';

    document.getElementById('payment-bank').textContent = bank.branch
      ? `${bank.bank} · ${bank.branch}`
      : bank.bank;
    document.getElementById('payment-account').textContent = bank.account_number;
    document.getElementById('payment-owner').textContent = bank.account_name;
    const amountElement = document.getElementById('payment-amount');
    amountElement.textContent = formatMoney(bank.amount);
    amountElement.dataset.copyValue = String(bank.amount);
    document.getElementById('payment-content').textContent = bank.content;

    const expiresAt = new Date(data.expires_at);
    document.getElementById('payment-expiry').textContent =
      `Đơn có hiệu lực đến ${expiresAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${expiresAt.toLocaleDateString('vi-VN')}.`;
    startPaymentPolling();
  } else {
    stopPaymentPolling();
    qr.hidden = true;
    qr.removeAttribute('src');
    stateIcon.hidden = false;
    stateIcon.textContent = meta.icon;
    transferCard.hidden = true;
    transferNote.hidden = true;
    document.getElementById('payment-expiry').textContent = '';
    caption.textContent = data.status === 'completed'
      ? 'Khoản thanh toán đã được xác nhận. Gói dịch vụ đã được kích hoạt trên tài khoản doanh nghiệp.'
      : 'Đơn này không còn hiệu lực. Vui lòng đóng cửa sổ và tạo một đơn thanh toán mới.';
  }

  setCheckoutStage('payment');
  showPurchaseModal();
}

async function confirmPurchase() {
  if (!selectedPackageId || !checkoutConfig) return;

  const terms = document.getElementById('checkout-terms');
  const btn = document.getElementById('confirm-btn');
  const alertSlot = document.getElementById('modal-alert');
  alertSlot.innerHTML = '';

  if (!terms.checked) {
    alertSlot.innerHTML = '<div class="alert alert-error">Bạn cần đọc và đồng ý với các điều khoản trước khi tạo đơn.</div>';
    terms.focus();
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Đang tạo đơn...';

  try {
    const data = await apiFetch('/payments/purchase', {
      method: 'POST',
      body: {
        package_id: selectedPackageId,
        payment_method: 'bank_transfer',
        terms_accepted: true,
        terms_version: checkoutConfig.terms_version,
        privacy_version: checkoutConfig.privacy_version
      }
    });

    const url = new URL(window.location.href);
    url.searchParams.set('payment', data.payment_id);
    window.history.replaceState({}, '', url);
    renderPaymentInstructions(data);
  } catch (err) {
    alertSlot.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = !terms.checked;
    btn.textContent = 'Tạo đơn chuyển khoản';
  }
}

async function restorePaymentFromUrl() {
  const paymentId = Number(new URLSearchParams(window.location.search).get('payment'));
  if (!Number.isInteger(paymentId) || paymentId <= 0) return;

  try {
    const data = await apiFetch(`/payments/${paymentId}`);
    renderPaymentInstructions(data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function stopPaymentPolling() {
  if (paymentPollTimer) {
    window.clearInterval(paymentPollTimer);
    paymentPollTimer = null;
  }
}

function startPaymentPolling() {
  stopPaymentPolling();
  if (!activePaymentId) return;

  paymentPollTimer = window.setInterval(async () => {
    try {
      const data = await apiFetch(`/payments/${activePaymentId}`);
      if (data.status !== 'pending') {
        renderPaymentInstructions(data);
      }
    } catch (error) {
      stopPaymentPolling();
    }
  }, 10000);
}

async function copyPaymentValue(button) {
  const target = document.getElementById(button.dataset.copy);
  if (!target) return;
  const value = target.dataset.copyValue || target.textContent.trim();

  try {
    await navigator.clipboard.writeText(value);
  } catch (error) {
    const input = document.createElement('textarea');
    input.value = value;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }

  const original = button.textContent;
  button.textContent = 'Đã chép';
  window.setTimeout(() => { button.textContent = original; }, 1200);
}

document.getElementById('checkout-terms').addEventListener('change', (event) => {
  document.getElementById('confirm-btn').disabled = !event.target.checked;
});

document.querySelectorAll('.copy-btn').forEach(button => {
  button.addEventListener('click', () => copyPaymentValue(button));
});

document.getElementById('payment-qr').addEventListener('error', () => {
  document.getElementById('modal-alert').innerHTML =
    '<div class="alert alert-warning">Không tải được ảnh VietQR. Bạn vẫn có thể chuyển khoản bằng thông tin bên cạnh.</div>';
});

document.getElementById('purchase-modal').addEventListener('click', (event) => {
  if (event.target === document.getElementById('purchase-modal')) closePurchaseModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.getElementById('purchase-modal').style.display === 'flex') {
    closePurchaseModal();
  }
});

loadPackages();
