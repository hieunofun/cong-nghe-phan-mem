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
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// GET /api/jobs/featured - tin noi bat cho trang chu
async function getFeatured(req, res) {
  try {
    const jobs = await jobModel.getFeatured(6);
    res.json(jobs);
  } catch (err) {
    console.error('getFeatured error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// GET /api/jobs/:id - chi tiet 1 tin (public)
async function getJobById(req, res) {
  try {
    const job = await jobModel.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Không tìm thấy tin tuyển dụng.' });
    await jobModel.incrementViews(req.params.id);
    res.json(job);
  } catch (err) {
    console.error('getJobById error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// GET /api/jobs/:id/availability - kiem tra tin con hoat dong ma khong tang luot xem
async function getJobAvailability(req, res) {
  try {
    const job = await jobModel.findById(req.params.id);
    if (!job) return res.status(404).json({ exists: false, active: false });
    res.json({ exists: true, active: job.status === 'active', status: job.status });
  } catch (err) {
    console.error('getJobAvailability error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// GET /api/jobs/company/my-jobs - danh sach tin cua doanh nghiep dang dang nhap
async function getMyJobs(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });

    const jobs = await jobModel.findByCompany(company.id);
    res.json(jobs);
  } catch (err) {
    console.error('getMyJobs error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// POST /api/jobs - doanh nghiep dang tin moi
async function createJob(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });

    if (company.status !== 'approved') {
      return res.status(403).json({
        message: 'Hồ sơ doanh nghiệp của bạn chưa được Admin duyệt. Vui lòng đợi duyệt trước khi đăng tin.'
      });
    }

    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: 'Vui lòng nhập tiêu đề và mô tả công việc.' });
    }

    // Kiem tra quota dang tin theo goi dich vu
    const sub = await subscriptionModel.getActiveByCompany(company.id);
    const isVip = req.body.is_vip === true || req.body.is_vip === 'true';

    if (sub) {
      if (sub.job_posts_used >= sub.max_job_posts) {
        return res.status(403).json({
          message: `Gói ${sub.package_name} đã hết hạn mức đăng tin (${sub.max_job_posts} tin/tháng). Vui lòng nâng cấp gói để đăng thêm.`,
          quota_exceeded: true
        });
      }
      if (isVip && sub.vip_posts_used >= sub.max_vip_posts) {
        return res.status(403).json({
          message: `Gói của bạn đã hết hạn mức tin VIP (${sub.max_vip_posts} tin VIP/tháng).`,
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
          message: 'Tài khoản miễn phí chỉ được đăng tối đa 3 tin đang hoạt động. Mua gói để đăng thêm tin và có thêm tính năng.',
          quota_exceeded: true,
          upgrade_required: true
        });
      }
    }

    const jobId = await jobModel.createJob(company.id, { ...req.body, is_vip: sub ? isVip : false });
    const job = await jobModel.findById(jobId);
    res.status(201).json({ message: 'Đăng tin tuyển dụng thành công!', job });
  } catch (err) {
    console.error('createJob error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// PUT /api/jobs/:id - doanh nghiep sua tin cua minh
async function updateJob(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });

    const job = await jobModel.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Không tìm thấy tin tuyển dụng.' });
    if (job.company_id !== company.id) {
      return res.status(403).json({ message: 'Bạn không có quyền sửa tin này.' });
    }

    await jobModel.updateJob(req.params.id, req.body);
    const updated = await jobModel.findById(req.params.id);
    res.json({ message: 'Cập nhật tin tuyển dụng thành công!', job: updated });
  } catch (err) {
    console.error('updateJob error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// DELETE /api/jobs/:id - doanh nghiep xoa tin cua minh
async function deleteJob(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });

    const job = await jobModel.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Không tìm thấy tin tuyển dụng.' });
    if (job.company_id !== company.id) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa tin này.' });
    }

    await jobModel.deleteJob(req.params.id);
    res.json({ message: 'Đã xóa tin tuyển dụng.' });
  } catch (err) {
    console.error('deleteJob error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

module.exports = {
  getJobs, getFeatured, getJobById, getJobAvailability,
  getMyJobs, createJob, updateJob, deleteJob
};
