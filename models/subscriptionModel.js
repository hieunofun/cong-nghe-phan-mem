// models/subscriptionModel.js
const pool = require('../config/db');

// Lay goi dang ky con hieu luc cua doanh nghiep
async function getActiveByCompany(companyId) {
  const [rows] = await pool.query(
    `SELECT cs.*, p.name AS package_name, p.code AS package_code,
            p.max_job_posts, p.max_vip_posts, p.can_search_cv, p.max_cv_views, p.price
     FROM company_subscriptions cs
     JOIN packages p ON p.id = cs.package_id
     WHERE cs.company_id = ? AND cs.status = 'active' AND cs.expires_at > NOW()
     ORDER BY cs.started_at DESC
     LIMIT 1`,
    [companyId]
  );
  return rows[0] || null;
}

async function create({ companyId, packageId, paymentId, durationDays }) {
  const [result] = await pool.query(
    `INSERT INTO company_subscriptions
       (company_id, package_id, payment_id, started_at, expires_at, status)
     VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active')`,
    [companyId, packageId, paymentId || null, durationDays]
  );
  return result.insertId;
}

async function incrementUsage(subId, field) {
  const allowed = ['job_posts_used', 'vip_posts_used', 'cv_views_used'];
  if (!allowed.includes(field)) return;
  await pool.query(`UPDATE company_subscriptions SET ${field} = ${field} + 1 WHERE id = ?`, [subId]);
}

async function getHistoryByCompany(companyId) {
  const [rows] = await pool.query(
    `SELECT cs.*, p.name AS package_name, p.price
     FROM company_subscriptions cs
     JOIN packages p ON p.id = cs.package_id
     WHERE cs.company_id = ?
     ORDER BY cs.started_at DESC`,
    [companyId]
  );
  return rows;
}

async function expireOld() {
  await pool.query(
    `UPDATE company_subscriptions SET status = 'expired'
     WHERE status = 'active' AND expires_at <= NOW()`
  );
}

module.exports = { getActiveByCompany, create, incrementUsage, getHistoryByCompany, expireOld };
