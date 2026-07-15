// controllers/paymentController.js
const packageModel = require('../models/packageModel');
const paymentModel = require('../models/paymentModel');
const subscriptionModel = require('../models/subscriptionModel');
const companyModel = require('../models/companyModel');

// GET /api/packages — danh sach goi dich vu (public)
async function getPackages(req, res) {
  try {
    const packages = await packageModel.getAll();
    res.json(packages);
  } catch (err) {
    console.error('getPackages error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// POST /api/payments/purchase — doanh nghiep mua goi
async function purchasePackage(req, res) {
  try {
    const { package_id, payment_method = 'demo' } = req.body;
    if (!package_id) return res.status(400).json({ message: 'Vui long chon goi dich vu.' });

    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });
    if (company.status !== 'approved') {
      return res.status(403).json({ message: 'Ho so doanh nghiep chua duoc Admin duyet.' });
    }

    const pkg = await packageModel.findById(package_id);
    if (!pkg || !pkg.is_active) return res.status(404).json({ message: 'Goi dich vu khong ton tai.' });
    if (pkg.code === 'free') return res.status(400).json({ message: 'Goi Mien phi khong can thanh toan.' });

    const payment = await paymentModel.create({
      companyId: company.id,
      packageId: pkg.id,
      amount: pkg.price,
      paymentMethod: payment_method
    });

    // Neu la demo -> xu ly ngay, kich hoat goi lien
    if (payment_method === 'demo') {
      await paymentModel.updateStatus(payment.id, 'completed', new Date());
      const subId = await subscriptionModel.create({
        companyId: company.id,
        packageId: pkg.id,
        paymentId: payment.id,
        durationDays: pkg.duration_days
      });
      return res.status(201).json({
        message: `Da kich hoat goi ${pkg.name} thanh cong! Co hieu luc trong ${pkg.duration_days} ngay.`,
        payment_id: payment.id,
        transaction_code: payment.transaction_code,
        status: 'completed',
        subscription_id: subId
      });
    }

    // Chuyen khoan / MoMo -> cho Admin duyet
    const bankInfo = {
      bank: 'MB Bank',
      account_number: '0123456789',
      account_name: 'CONG TY TNHH JOBLINK',
      amount: pkg.price,
      content: `JOBLINK ${payment.transaction_code}`
    };

    res.status(201).json({
      message: 'Da tao don thanh toan. Vui long chuyen khoan theo thong tin duoi day va cho Admin xac nhan (thong thuong trong 1-2 gio lam viec).',
      payment_id: payment.id,
      transaction_code: payment.transaction_code,
      status: 'pending',
      bank_info: bankInfo
    });
  } catch (err) {
    console.error('purchasePackage error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// GET /api/payments/my — lich su thanh toan cua doanh nghiep
async function getMyPayments(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });
    const payments = await paymentModel.findByCompany(company.id);
    res.json(payments);
  } catch (err) {
    console.error('getMyPayments error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// GET /api/payments/subscription — goi hien tai cua doanh nghiep
async function getMySubscription(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });
    const sub = await subscriptionModel.getActiveByCompany(company.id);
    res.json(sub || null);
  } catch (err) {
    console.error('getMySubscription error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// GET /api/payments/history — lich su goi dang ky
async function getSubscriptionHistory(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });
    const history = await subscriptionModel.getHistoryByCompany(company.id);
    res.json(history);
  } catch (err) {
    console.error('getSubscriptionHistory error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
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
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// PUT /api/admin/payments/:id/approve — admin xac nhan thanh toan
async function adminApprovePayment(req, res) {
  try {
    const payment = await paymentModel.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Khong tim thay giao dich.' });
    if (payment.status !== 'pending') {
      return res.status(400).json({ message: 'Giao dich nay khong o trang thai cho duyet.' });
    }

    await paymentModel.updateStatus(req.params.id, 'completed', new Date());
    await subscriptionModel.create({
      companyId: payment.company_id,
      packageId: payment.package_id,
      paymentId: payment.id,
      durationDays: payment.duration_days
    });

    res.json({ message: `Da xac nhan thanh toan va kich hoat goi ${payment.package_name} cho ${payment.company_name}.` });
  } catch (err) {
    console.error('adminApprovePayment error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// PUT /api/admin/payments/:id/reject — admin tu choi thanh toan
async function adminRejectPayment(req, res) {
  try {
    const payment = await paymentModel.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Khong tim thay giao dich.' });
    await paymentModel.updateStatus(req.params.id, 'failed', null);
    res.json({ message: 'Da tu choi giao dich.' });
  } catch (err) {
    console.error('adminRejectPayment error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// GET /api/admin/revenue — thong ke doanh thu
async function adminGetRevenue(req, res) {
  try {
    const stats = await paymentModel.getRevenueStats();
    res.json(stats);
  } catch (err) {
    console.error('adminGetRevenue error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

module.exports = {
  getPackages,
  purchasePackage, getMyPayments, getMySubscription, getSubscriptionHistory,
  adminGetPayments, adminApprovePayment, adminRejectPayment, adminGetRevenue
};
