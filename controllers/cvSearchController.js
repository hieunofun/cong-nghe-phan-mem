// controllers/cvSearchController.js
const pool = require('../config/db');
const companyModel = require('../models/companyModel');
const subscriptionModel = require('../models/subscriptionModel');

// GET /api/cv-search?keyword=&location=&gender=&page=
async function searchCandidates(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });

    const sub = await subscriptionModel.getActiveByCompany(company.id);
    if (!sub || !sub.can_search_cv) {
      return res.status(403).json({
        message: 'Tinh nang Kho CV chi danh cho goi Pro va Enterprise. Vui long nang cap goi de su dung.',
        upgrade_required: true
      });
    }

    if (sub.max_cv_views < 999 && sub.cv_views_used >= sub.max_cv_views) {
      return res.status(403).json({
        message: `Ban da xem het ${sub.max_cv_views} CV trong goi hien tai. Vui long nang cap goi.`,
        quota_exceeded: true
      });
    }

    const { keyword, location, gender, page = 1, limit = 10 } = req.query;
    const where = ['cd.is_searchable = TRUE'];
    const params = [];

    if (keyword) {
      where.push('(cd.full_name LIKE ? OR cd.skills LIKE ? OR cd.experience LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (location) {
      where.push('cd.address LIKE ?');
      params.push(`%${location}%`);
    }
    if (gender) {
      where.push('cd.gender = ?');
      params.push(gender);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const offset = (Number(page) - 1) * Number(limit);

    // An thong tin lien lac (email, phone) trong ket qua list
    const [candidates] = await pool.query(
      `SELECT cd.id, cd.full_name, cd.address, cd.gender, cd.skills,
              cd.experience, cd.education, cd.avatar_url, cd.created_at,
              NULL AS phone, NULL AS email, NULL AS cv_url
       FROM candidates cd
       ${whereClause}
       ORDER BY cd.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM candidates cd ${whereClause}`,
      params
    );

    res.json({
      candidates,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      cv_views_used: sub.cv_views_used,
      cv_views_limit: sub.max_cv_views
    });
  } catch (err) {
    console.error('searchCandidates error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// GET /api/cv-search/:id — xem chi tiet 1 ung vien (tinh quota)
async function viewCandidateDetail(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });

    const sub = await subscriptionModel.getActiveByCompany(company.id);
    if (!sub || !sub.can_search_cv) {
      return res.status(403).json({
        message: 'Tinh nang Kho CV chi danh cho goi Pro va Enterprise.',
        upgrade_required: true
      });
    }

    if (sub.max_cv_views < 999 && sub.cv_views_used >= sub.max_cv_views) {
      return res.status(403).json({
        message: `Ban da xem het ${sub.max_cv_views} CV trong thang nay.`,
        quota_exceeded: true
      });
    }

    const [rows] = await pool.query(
      `SELECT cd.*, u.email
       FROM candidates cd
       JOIN users u ON u.id = cd.user_id
       WHERE cd.id = ? AND cd.is_searchable = TRUE`,
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ message: 'Khong tim thay ung vien.' });

    // Tinh 1 luot xem CV
    await subscriptionModel.incrementUsage(sub.id, 'cv_views_used');

    res.json({
      candidate: rows[0],
      cv_views_used: sub.cv_views_used + 1,
      cv_views_limit: sub.max_cv_views
    });
  } catch (err) {
    console.error('viewCandidateDetail error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

module.exports = { searchCandidates, viewCandidateDetail };
