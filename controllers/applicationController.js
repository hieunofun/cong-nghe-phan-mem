// controllers/applicationController.js
const applicationModel = require('../models/applicationModel');
const candidateModel = require('../models/candidateModel');
const companyModel = require('../models/companyModel');
const jobModel = require('../models/jobModel');

const VALID_STATUSES = ['pending', 'reviewing', 'interview', 'accepted', 'rejected'];

// POST /api/applications/:jobId - ung vien ung tuyen vao 1 tin
async function applyToJob(req, res) {
  try {
    const candidate = await candidateModel.findByUserId(req.user.id);
    if (!candidate) return res.status(404).json({ message: 'Khong tim thay ho so ung vien.' });

    const job = await jobModel.findById(req.params.jobId);
    if (!job || job.status !== 'active') {
      return res.status(404).json({ message: 'Tin tuyen dung khong ton tai hoac da dong.' });
    }

    const already = await applicationModel.hasApplied(req.params.jobId, candidate.id);
    if (already) {
      return res.status(409).json({ message: 'Ban da ung tuyen vao tin nay roi.' });
    }

    // Dung CV moi upload (neu co) hoac CV da luu trong ho so
    const cvUrl = req.file ? `/uploads/cv/${req.file.filename}` : candidate.cv_url;
    if (!cvUrl) {
      return res.status(400).json({ message: 'Vui long upload CV truoc khi ung tuyen.' });
    }

    const { cover_letter } = req.body;
    const applicationId = await applicationModel.create({
      jobId: req.params.jobId,
      candidateId: candidate.id,
      cvUrl,
      coverLetter: cover_letter
    });

    res.status(201).json({ message: 'Ung tuyen thanh cong!', applicationId });
  } catch (err) {
    console.error('applyToJob error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// GET /api/applications/job/:jobId - doanh nghiep xem danh sach ung vien cua 1 tin
async function getApplicationsForJob(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });

    const job = await jobModel.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Khong tim thay tin tuyen dung.' });
    if (job.company_id !== company.id) {
      return res.status(403).json({ message: 'Ban khong co quyen xem ung vien cua tin nay.' });
    }

    const applications = await applicationModel.findByJob(req.params.jobId);
    res.json(applications);
  } catch (err) {
    console.error('getApplicationsForJob error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// PUT /api/applications/:id/status - doanh nghiep cap nhat trang thai pipeline
async function updateApplicationStatus(req, res) {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Trang thai khong hop le. Cho phep: ${VALID_STATUSES.join(', ')}` });
    }

    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });

    const application = await applicationModel.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Khong tim thay ho so ung tuyen.' });
    if (application.company_id !== company.id) {
      return res.status(403).json({ message: 'Ban khong co quyen cap nhat ho so ung tuyen nay.' });
    }

    await applicationModel.updateStatus(req.params.id, status);
    res.json({ message: 'Da cap nhat trang thai ung vien.' });
  } catch (err) {
    console.error('updateApplicationStatus error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// GET /api/applications/stats - thong ke so luong ung vien theo trang thai (company dashboard)
async function getStats(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });

    const stats = await applicationModel.countByCompanyAndStatus(company.id);
    res.json(stats);
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

module.exports = { applyToJob, getApplicationsForJob, updateApplicationStatus, getStats };
