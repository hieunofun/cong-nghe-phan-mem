// public/js/packages.js

let selectedPackageId = null;
let selectedMethod = 'demo';
let packagesData = [];

function formatPrice(price) {
  if (price === 0) return 'Miễn phí';
  return price.toLocaleString('vi-VN') + ' đ/tháng';
}

function packageCardHtml(pkg) {
  const isPopular = pkg.code === 'pro';
  const isFree = pkg.code === 'free';

  const features = [
    { text: `${pkg.max_job_posts >= 999 ? 'Không giới hạn' : pkg.max_job_posts} tin đăng/tháng`, ok: true },
    { text: `${pkg.max_vip_posts >= 999 ? 'Không giới hạn' : pkg.max_vip_posts} tin VIP nổi bật`, ok: pkg.max_vip_posts > 0 },
    { text: 'Tìm kiếm Kho CV ứng viên', ok: pkg.can_search_cv },
    { text: pkg.max_cv_views >= 999 ? 'Xem CV không giới hạn' : `Xem tối đa ${pkg.max_cv_views} CV/tháng`, ok: pkg.can_search_cv },
    { text: 'Hồ sơ công ty nổi bật', ok: pkg.code !== 'free' },
    { text: 'Hỗ trợ ưu tiên', ok: pkg.code === 'enterprise' }
  ];

  return `
    <div class="pricing-card ${isPopular ? 'popular' : ''}">
      ${isPopular ? '<div class="popular-badge">Phổ biến nhất</div>' : ''}
      <div>
        <div style="font-family:var(--font-display); font-weight:700; font-size:1.1rem; margin-bottom:6px;">${escapeHtml(pkg.name)}</div>
        <div class="price-tag">${pkg.price === 0 ? 'Miễn phí' : (pkg.price / 1000000).toFixed(1).replace('.0', '') + ' triệu'}${pkg.price > 0 ? '<span>/tháng</span>' : ''}</div>
      </div>
      <p style="font-size:0.85rem; color:var(--ink-soft);">${escapeHtml(pkg.description)}</p>
      <ul class="feature-list">
        ${features.map(f => `<li class="${f.ok ? '' : 'no'}">${f.text}</li>`).join('')}
      </ul>
      ${isFree
        ? `<div class="btn btn-outline" style="text-align:center; padding:11px; border-radius:100px; font-weight:600; font-size:0.9rem; color:var(--ink-soft);">Gói hiện tại (mặc định)</div>`
        : `<button class="btn ${isPopular ? 'btn-primary' : 'btn-outline'} btn-block" onclick="openPurchaseModal(${pkg.id})">Mua ngay</button>`
      }
    </div>
  `;
}

async function loadPackages() {
  const grid = document.getElementById('pricing-grid');
  try {
    packagesData = await apiFetch('/payments/packages', { auth: false });
    grid.innerHTML = packagesData.map(packageCardHtml).join('');
  } catch (err) {
    grid.innerHTML = `<div class="alert alert-error">Không tải được danh sách gói: ${escapeHtml(err.message)}</div>`;
  }
}

function openPurchaseModal(pkgId) {
  const user = getUser();
  if (!user) {
    showToast('Vui lòng đăng nhập với tài khoản Doanh nghiệp để mua gói.', 'error');
    setTimeout(() => { window.location.href = '/login.html'; }, 1200);
    return;
  }
  if (user.role !== 'company') {
    showToast('Chỉ tài khoản Doanh nghiệp mới có thể mua gói dịch vụ.', 'error');
    return;
  }

  selectedPackageId = pkgId;
  const pkg = packagesData.find(p => p.id === pkgId);
  if (!pkg) return;

  document.getElementById('modal-pkg-name').textContent = `Mua gói ${pkg.name}`;
  document.getElementById('modal-price').textContent = pkg.price.toLocaleString('vi-VN') + ' đ';
  document.getElementById('modal-duration').textContent = `Hiệu lực ${pkg.duration_days} ngày`;
  document.getElementById('bank-amount').textContent = pkg.price.toLocaleString('vi-VN') + ' đồng';
  document.getElementById('modal-alert').innerHTML = '';

  selectedMethod = 'demo';
  document.querySelectorAll('.method-btn').forEach(b => b.classList.toggle('selected', b.dataset.method === 'demo'));
  document.getElementById('bank-info-box').style.display = 'none';

  document.getElementById('purchase-modal').style.display = 'flex';
}

function closePurchaseModal() {
  document.getElementById('purchase-modal').style.display = 'none';
}

function selectMethod(btn) {
  selectedMethod = btn.dataset.method;
  document.querySelectorAll('.method-btn').forEach(b => b.classList.toggle('selected', b === btn));
  document.getElementById('bank-info-box').style.display =
    (selectedMethod === 'bank_transfer' || selectedMethod === 'momo') ? 'block' : 'none';
}

async function confirmPurchase() {
  if (!selectedPackageId) return;
  const btn = document.getElementById('confirm-btn');
  const alertSlot = document.getElementById('modal-alert');
  alertSlot.innerHTML = '';
  btn.disabled = true;
  btn.innerHTML = `<span class="loading-spinner"></span> Đang xử lý...`;

  try {
    const data = await apiFetch('/payments/purchase', {
      method: 'POST',
      body: { package_id: selectedPackageId, payment_method: selectedMethod }
    });

    closePurchaseModal();
    const pkg = packagesData.find(p => p.id === selectedPackageId);

    document.getElementById('result-icon').textContent = data.status === 'completed' ? '✅' : '⏳';
    document.getElementById('result-title').textContent = data.status === 'completed' ? 'Kích hoạt thành công!' : 'Đặt mua thành công!';
    document.getElementById('result-msg').textContent = data.message;
    document.getElementById('result-tx').textContent = data.transaction_code;

    if (selectedMethod === 'bank_transfer' || selectedMethod === 'momo') {
      document.getElementById('bank-content').textContent = `JOBLINK ${data.transaction_code}`;
    }

    document.getElementById('result-modal').style.display = 'flex';
  } catch (err) {
    alertSlot.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Xác nhận mua gói';
  }
}

document.getElementById('purchase-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('purchase-modal')) closePurchaseModal();
});

loadPackages();
