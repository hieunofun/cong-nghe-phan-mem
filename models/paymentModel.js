// models/paymentModel.js
const pool = require('../config/db');
const crypto = require('crypto');
const { withEffectivePaymentStatus } = require('../utils/paymentStatus');

function createTransactionCode() {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `JL${timePart}${randomPart}`;
}

async function create({
  companyId,
  packageId,
  amount,
  paymentMethod,
  expiresAt,
  termsAcceptedAt,
  termsVersion,
  privacyVersion,
  acceptedIp,
  acceptedUserAgent
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const txCode = createTransactionCode();
    try {
      const [result] = await pool.query(
        `INSERT INTO payments
           (company_id, package_id, amount, status, payment_method, transaction_code,
            expires_at, terms_accepted_at, terms_version, privacy_version,
            accepted_ip, accepted_user_agent)
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          packageId,
          amount,
          paymentMethod,
          txCode,
          expiresAt,
          termsAcceptedAt,
          termsVersion,
          privacyVersion,
          acceptedIp,
          acceptedUserAgent
        ]
      );
      return { id: result.insertId, transaction_code: txCode, expires_at: expiresAt };
    } catch (error) {
      const isDuplicate = error.code === 'ER_DUP_ENTRY' || error.code === '23505';
      if (!isDuplicate || attempt === 2) throw error;
    }
  }
  throw new Error('Không thể tạo mã giao dịch duy nhất.');
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT p.*, c.company_name, u.email, pk.name AS package_name, pk.code AS package_code,
            pk.duration_days
     FROM payments p
     JOIN companies c ON c.id = p.company_id
     JOIN users u ON u.id = c.user_id
     JOIN packages pk ON pk.id = p.package_id
     WHERE p.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findByCompany(companyId) {
  const [rows] = await pool.query(
    `SELECT p.id, p.package_id, p.amount, p.status, p.payment_method,
            p.transaction_code, p.expires_at, p.paid_at, p.created_at,
            pk.name AS package_name, pk.code AS package_code
     FROM payments p
     JOIN packages pk ON pk.id = p.package_id
     WHERE p.company_id = ?
     ORDER BY p.created_at DESC`,
    [companyId]
  );
  return rows.map((payment) => withEffectivePaymentStatus(payment));
}

async function findReusablePending(companyId, packageId, termsVersion, privacyVersion) {
  const [rows] = await pool.query(
    `SELECT p.*, pk.name AS package_name, pk.code AS package_code, pk.duration_days
     FROM payments p
     JOIN packages pk ON pk.id = p.package_id
     WHERE p.company_id = ?
       AND p.package_id = ?
       AND p.status = 'pending'
       AND p.expires_at > NOW()
       AND p.terms_version = ?
       AND p.privacy_version = ?
     ORDER BY p.created_at DESC
     LIMIT 1`,
    [companyId, packageId, termsVersion, privacyVersion]
  );
  return rows[0] || null;
}

async function updateStatus(id, status, paidAt = null) {
  await pool.query(
    'UPDATE payments SET status = ?, paid_at = ? WHERE id = ?',
    [status, paidAt, id]
  );
}

async function updateStatusIfCurrent(id, expectedStatus, nextStatus, paidAt = null) {
  const [result] = await pool.query(
    'UPDATE payments SET status = ?, paid_at = ? WHERE id = ? AND status = ?',
    [nextStatus, paidAt, id, expectedStatus]
  );
  return result.affectedRows === 1;
}

async function getAll({ status } = {}) {
  let sql = `SELECT p.*, c.company_name, u.email, pk.name AS package_name
             FROM payments p
             JOIN companies c ON c.id = p.company_id
             JOIN users u ON u.id = c.user_id
             JOIN packages pk ON pk.id = p.package_id`;
  const params = [];
  if (status) { sql += ' WHERE p.status = ?'; params.push(status); }
  sql += ' ORDER BY p.created_at DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getRevenueStats() {
  // Tong doanh thu
  const [[{ totalRevenue }]] = await pool.query(
    "SELECT COALESCE(SUM(amount), 0) AS totalRevenue FROM payments WHERE status = 'completed'"
  );
  // Doanh thu thang nay
  const [[{ monthRevenue }]] = await pool.query(
    "SELECT COALESCE(SUM(amount), 0) AS monthRevenue FROM payments WHERE status = 'completed' AND MONTH(paid_at) = MONTH(NOW()) AND YEAR(paid_at) = YEAR(NOW())"
  );
  // So goi dang ky dang hoat dong
  const [[{ activeSubscriptions }]] = await pool.query(
    "SELECT COUNT(*) AS activeSubscriptions FROM company_subscriptions WHERE status = 'active' AND expires_at > NOW()"
  );
  // So giao dich cho duyet
  const [[{ pendingPayments }]] = await pool.query(
    "SELECT COUNT(*) AS pendingPayments FROM payments WHERE status = 'pending'"
  );
  // Doanh thu 6 thang gan nhat
  const [monthlyRevenue] = await pool.query(
    `SELECT DATE_FORMAT(paid_at, '%Y-%m') AS month,
            SUM(amount) AS revenue, COUNT(*) AS count
     FROM payments
     WHERE status = 'completed' AND paid_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
     GROUP BY DATE_FORMAT(paid_at, '%Y-%m')
     ORDER BY month ASC`
  );
  // Doanh thu theo goi
  const [byPackage] = await pool.query(
    `SELECT pk.name, pk.code, COUNT(*) AS count, SUM(p.amount) AS revenue
     FROM payments p
     JOIN packages pk ON pk.id = p.package_id
     WHERE p.status = 'completed'
     GROUP BY pk.id, pk.name, pk.code
     ORDER BY revenue DESC`
  );

  return { totalRevenue, monthRevenue, activeSubscriptions, pendingPayments, monthlyRevenue, byPackage };
}

module.exports = {
  create,
  findById,
  findByCompany,
  findReusablePending,
  updateStatus,
  updateStatusIfCurrent,
  getAll,
  getRevenueStats
};
