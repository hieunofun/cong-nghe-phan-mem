// controllers/paymentController.js
const packageModel = require('../models/packageModel');
const paymentModel = require('../models/paymentModel');
const subscriptionModel = require('../models/subscriptionModel');
const companyModel = require('../models/companyModel');
const {
  BANK,
  PAYMENT_TERMS_VERSION,
  PRIVACY_VERSION,
  PAYMENT_WINDOW_HOURS,
  isBankConfigured,
  bankTransferInfo
} = require('../config/payment');

function requestIp(req) {
  return String(req.ip || '').slice(0, 64) || null;
}

function isExpired(payment) {
  return Boolean(
    payment.status === 'pending' &&
    payment.expires_at &&
    new Date(payment.expires_at).getTime() <= Date.now()
  );
}

function isoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function paymentPayload(payment, pkg = null) {
  const expired = isExpired(payment);
  const status = expired ? 'expired' : payment.status;
  const packageName = payment.package_name || pkg?.name;
  const packageCode = payment.package_code || pkg?.code;
  const durationDays = payment.duration_days || pkg?.duration_days;
  const transactionCode = payment.transaction_code;

  return {
    payment_id: payment.id,
    transaction_code: transactionCode,
    status,
    amount: Number(payment.amount),
    expires_at: isoDate(payment.expires_at),
    created_at: isoDate(payment.created_at),
    paid_at: isoDate(payment.paid_at),
    package: {
      id: payment.package_id || pkg?.id,
      name: packageName,
      code: packageCode,
      duration_days: durationDays
    },
    bank_info: status === 'pending'
      ? bankTransferInfo({ amount: Number(payment.amount), transactionCode })
      : null
  };
}

// GET /api/packages — danh sach goi dich vu (public)
async function getPackages(req, res) {
  try {
    const packages = await packageModel.getAll();
    res.json(packages);
  } catch (err) {
    console.error('getPackages error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// GET /api/payments/checkout-config — cau hinh cong khai cho checkout
function getCheckoutConfig(req, res) {
  res.json({
    payment_methods: ['bank_transfer'],
    terms_version: PAYMENT_TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
    payment_window_hours: PAYMENT_WINDOW_HOURS,
    bank_configured: isBankConfigured(),
    bank: {
      id: BANK.id,
      name: BANK.name,
      account_name: BANK.accountName,
      branch: BANK.branch
    }
  });
}

// POST /api/payments/purchase — doanh nghiep mua goi
async function purchasePackage(req, res) {
  try {
    const {
      package_id,
      payment_method = 'bank_transfer',
      terms_accepted,
      terms_version,
      privacy_version
    } = req.body;
    if (!package_id) return res.status(400).json({ message: 'Vui lòng chọn gói dịch vụ.' });
    if (!isBankConfigured()) {
      return res.status(503).json({
        message: 'Hệ thống chưa cấu hình tài khoản nhận thanh toán. Vui lòng liên hệ quản trị viên.'
      });
    }
    if (payment_method !== 'bank_transfer') {
      return res.status(400).json({
        message: 'Phương thức thanh toán này chưa được hỗ trợ. Vui lòng sử dụng chuyển khoản ngân hàng.'
      });
    }
    if (terms_accepted !== true) {
      return res.status(400).json({
        message: 'Bạn cần đồng ý với Điều khoản dịch vụ, Chính sách thanh toán và Chính sách bảo mật.'
      });
    }
    if (terms_version !== PAYMENT_TERMS_VERSION || privacy_version !== PRIVACY_VERSION) {
      return res.status(409).json({
        message: 'Điều khoản đã được cập nhật. Vui lòng tải lại trang và đọc phiên bản mới trước khi thanh toán.'
      });
    }

    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });
    if (company.status !== 'approved') {
      return res.status(403).json({ message: 'Hồ sơ doanh nghiệp chưa được Admin duyệt.' });
    }

    const pkg = await packageModel.findById(package_id);
    if (!pkg || !pkg.is_active) return res.status(404).json({ message: 'Gói dịch vụ không tồn tại.' });
    if (pkg.code === 'free') return res.status(400).json({ message: 'Gói Miễn phí không cần thanh toán.' });

    const reusablePayment = await paymentModel.findReusablePending(
      company.id,
      pkg.id,
      PAYMENT_TERMS_VERSION,
      PRIVACY_VERSION
    );
    if (reusablePayment) {
      return res.json({
        message: 'Bạn đã có một đơn đang chờ thanh toán cho gói này.',
        reused: true,
        ...paymentPayload(reusablePayment, pkg)
      });
    }

    const expiresAt = new Date(Date.now() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000);
    const acceptedAt = new Date();
    const payment = await paymentModel.create({
      companyId: company.id,
      packageId: pkg.id,
      amount: pkg.price,
      paymentMethod: 'bank_transfer',
      expiresAt,
      termsAcceptedAt: acceptedAt,
      termsVersion: PAYMENT_TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      acceptedIp: requestIp(req),
      acceptedUserAgent: String(req.get('user-agent') || '').slice(0, 500) || null
    });

    res.status(201).json({
      message: 'Đã tạo đơn. Quét VietQR hoặc chuyển khoản đúng số tiền và nội dung để JobLink đối soát.',
      reused: false,
      ...paymentPayload({
        ...payment,
        package_id: pkg.id,
        amount: pkg.price,
        status: 'pending'
      }, pkg)
    });
  } catch (err) {
    console.error('purchasePackage error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// GET /api/payments/:id — xem trang thai va huong dan cua mot don thanh toan
async function getMyPayment(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });

    const payment = await paymentModel.findById(req.params.id);
    if (!payment || Number(payment.company_id) !== Number(company.id)) {
      return res.status(404).json({ message: 'Không tìm thấy đơn thanh toán.' });
    }

    res.json(paymentPayload(payment));
  } catch (err) {
    console.error('getMyPayment error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// GET /api/payments/my — lich su thanh toan cua doanh nghiep
async function getMyPayments(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });
    const payments = await paymentModel.findByCompany(company.id);
    res.json(payments);
  } catch (err) {
    console.error('getMyPayments error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// GET /api/payments/subscription — goi hien tai cua doanh nghiep
async function getMySubscription(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });
    const sub = await subscriptionModel.getActiveByCompany(company.id);
    res.json(sub || null);
  } catch (err) {
    console.error('getMySubscription error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// GET /api/payments/history — lich su goi dang ky
async function getSubscriptionHistory(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });
    const history = await subscriptionModel.getHistoryByCompany(company.id);
    res.json(history);
  } catch (err) {
    console.error('getSubscriptionHistory error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// --- ADMIN ---
// GET /api/admin/payments — tat ca giao dich
async function adminGetPayments(req, res) {
  try {
    const payments = await paymentModel.getAll({ status: req.query.status });
    res.json(payments);
  } catch (err) {
    console.error('adminGetPayments error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// PUT /api/admin/payments/:id/approve — admin xac nhan thanh toan
async function adminApprovePayment(req, res) {
  try {
    const payment = await paymentModel.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Không tìm thấy giao dịch.' });
    if (payment.status !== 'pending') {
      return res.status(400).json({ message: 'Giao dịch này không ở trạng thái chờ duyệt.' });
    }
    if (isExpired(payment)) {
      await paymentModel.updateStatusIfCurrent(payment.id, 'pending', 'failed', null);
      return res.status(400).json({ message: 'Đơn thanh toán đã hết hạn và không thể kích hoạt.' });
    }

    const paidAt = new Date();
    const transitioned = await paymentModel.updateStatusIfCurrent(
      payment.id,
      'pending',
      'completed',
      paidAt
    );
    if (!transitioned) {
      return res.status(409).json({ message: 'Giao dịch vừa được xử lý bởi một yêu cầu khác.' });
    }

    try {
      await subscriptionModel.create({
        companyId: payment.company_id,
        packageId: payment.package_id,
        paymentId: payment.id,
        durationDays: payment.duration_days
      });
    } catch (error) {
      await paymentModel.updateStatusIfCurrent(payment.id, 'completed', 'pending', null);
      throw error;
    }

    res.json({ message: `Đã xác nhận thanh toán và kích hoạt gói ${payment.package_name} cho ${payment.company_name}.` });
  } catch (err) {
    console.error('adminApprovePayment error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// PUT /api/admin/payments/:id/reject — admin tu choi thanh toan
async function adminRejectPayment(req, res) {
  try {
    const payment = await paymentModel.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Không tìm thấy giao dịch.' });
    if (payment.status !== 'pending') {
      return res.status(400).json({ message: 'Chỉ có thể từ chối giao dịch đang chờ duyệt.' });
    }
    const transitioned = await paymentModel.updateStatusIfCurrent(payment.id, 'pending', 'failed', null);
    if (!transitioned) {
      return res.status(409).json({ message: 'Giao dịch vừa được xử lý bởi một yêu cầu khác.' });
    }
    res.json({ message: 'Đã từ chối giao dịch.' });
  } catch (err) {
    console.error('adminRejectPayment error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// GET /api/admin/revenue — thong ke doanh thu
async function adminGetRevenue(req, res) {
  try {
    const stats = await paymentModel.getRevenueStats();
    res.json(stats);
  } catch (err) {
    console.error('adminGetRevenue error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

module.exports = {
  getPackages, getCheckoutConfig,
  purchasePackage, getMyPayment, getMyPayments, getMySubscription, getSubscriptionHistory,
  adminGetPayments, adminApprovePayment, adminRejectPayment, adminGetRevenue
};
