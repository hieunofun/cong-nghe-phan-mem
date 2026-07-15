// controllers/jobController.js
const jobModel = require('../models/jobModel');
const companyModel = require('../models/companyModel');
const subscriptionModel = require('../models/subscriptionModel');

// GET /api/jobs - tim kiem / loc tin tuyen dung (public)
async function getJobs(req, res) {
  try {
    const { keyword, category_id, location, job_type, salary_min, page, limit } = req.query;
    const result = await jobModel.search({
      keyword, category_id, location, job_type, salary_min,
      page: page || 1,
      limit: limit || 10
    });
    res.json({
      jobs: result.jobs,
      total: result.total,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      totalPages: Math.ceil(result.total / (Number(limit) || 10))
    });
  } catch (err) {
    console.error('getJobs error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// GET /api/jobs/featured - tin noi bat cho trang chu
async function getFeatured(req, res) {
  try {
    const jobs = await jobModel.getFeatured(6);
    res.json(jobs);
  } catch (err) {
    console.error('getFeatured error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// GET /api/jobs/:id - chi tiet 1 tin (public)
async function getJobById(req, res) {
  try {
    const job = await jobModel.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Khong tim thay tin tuyen dung.' });
    await jobModel.incrementViews(req.params.id);
    res.json(job);
  } catch (err) {
    console.error('getJobById error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// GET /api/jobs/company/my-jobs - danh sach tin cua doanh nghiep dang dang nhap
async function getMyJobs(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });

    const jobs = await jobModel.findByCompany(company.id);
    res.json(jobs);
  } catch (err) {
    console.error('getMyJobs error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// POST /api/jobs - doanh nghiep dang tin moi
async function createJob(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });

    if (company.status !== 'approved') {
      return res.status(403).json({
        message: 'Ho so doanh nghiep cua ban chua duoc Admin duyet. Vui long doi duyet truoc khi dang tin.'
      });
    }

    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: 'Vui long nhap Tieu de va Mo ta cong viec.' });
    }

    // Kiem tra quota dang tin theo goi dich vu
    const sub = await subscriptionModel.getActiveByCompany(company.id);
    const isVip = req.body.is_vip === true || req.body.is_vip === 'true';

    if (sub) {
      if (sub.job_posts_used >= sub.max_job_posts) {
        return res.status(403).json({
          message: `Goi ${sub.package_name} da het quota dang tin (${sub.max_job_posts} tin/thang). Vui long nang cap goi de dang them.`,
          quota_exceeded: true
        });
      }
      if (isVip && sub.vip_posts_used >= sub.max_vip_posts) {
        return res.status(403).json({
          message: `Goi cua ban da het quota tin VIP (${sub.max_vip_posts} tin VIP/thang).`,
          quota_exceeded: true
        });
      }
      await subscriptionModel.incrementUsage(sub.id, 'job_posts_used');
      if (isVip) await subscriptionModel.incrementUsage(sub.id, 'vip_posts_used');
    } else {
      // Goi mien phi: toi da 3 tin dang hoat dong
      const activeCount = await jobModel.countActiveByCompany(company.id);
      if (activeCount >= 3) {
        return res.status(403).json({
          message: 'Tai khoan mien phi chi duoc dang toi da 3 tin dang hoat dong. Mua goi de dang them tin va co them tinh nang.',
          quota_exceeded: true,
          upgrade_required: true
        });
      }
    }

    const jobId = await jobModel.createJob(company.id, { ...req.body, is_vip: sub ? isVip : false });
    const job = await jobModel.findById(jobId);
    res.status(201).json({ message: 'Dang tin tuyen dung thanh cong!', job });
  } catch (err) {
    console.error('createJob error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// PUT /api/jobs/:id - doanh nghiep sua tin cua minh
async function updateJob(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });

    const job = await jobModel.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Khong tim thay tin tuyen dung.' });
    if (job.company_id !== company.id) {
      return res.status(403).json({ message: 'Ban khong co quyen sua tin nay.' });
    }

    await jobModel.updateJob(req.params.id, req.body);
    const updated = await jobModel.findById(req.params.id);
    res.json({ message: 'Cap nhat tin tuyen dung thanh cong!', job: updated });
  } catch (err) {
    console.error('updateJob error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// DELETE /api/jobs/:id - doanh nghiep xoa tin cua minh
async function deleteJob(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });

    const job = await jobModel.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Khong tim thay tin tuyen dung.' });
    if (job.company_id !== company.id) {
      return res.status(403).json({ message: 'Ban khong co quyen xoa tin nay.' });
    }

    await jobModel.deleteJob(req.params.id);
    res.json({ message: 'Da xoa tin tuyen dung.' });
  } catch (err) {
    console.error('deleteJob error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

module.exports = { getJobs, getFeatured, getJobById, getMyJobs, createJob, updateJob, deleteJob };
