// controllers/applicationController.js
const applicationModel = require('../models/applicationModel');
const candidateModel = require('../models/candidateModel');
const companyModel = require('../models/companyModel');
const jobModel = require('../models/jobModel');
const savedJobModel = require('../models/savedJobModel');
const { deleteStoredFile, storeUploadedFile, withAccessibleCVUrls } = require('../services/storageService');

const VALID_STATUSES = ['pending', 'reviewing', 'interview', 'accepted', 'rejected'];
const ALLOWED_STATUS_TRANSITIONS = {
  pending: ['reviewing', 'rejected'],
  reviewing: ['pending', 'interview', 'rejected'],
  interview: ['reviewing', 'accepted', 'rejected'],
  accepted: ['reviewing'],
  rejected: ['reviewing']
};
const TERMINAL_STATUSES = ['accepted', 'rejected'];

// POST /api/applications/:jobId - ung vien ung tuyen vao 1 tin
async function applyToJob(req, res) {
  let uploadedCVUrl = null;
  let applicationCreated = false;
  try {
    const candidate = await candidateModel.findByUserId(req.user.id);
    if (!candidate) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng viên.' });

    const job = await jobModel.findById(req.params.jobId);
    if (!job || job.status !== 'active') {
      return res.status(404).json({ message: 'Tin tuyển dụng không tồn tại hoặc đã đóng.' });
    }

    const already = await applicationModel.hasApplied(req.params.jobId, candidate.id);
    if (already) {
      return res.status(409).json({ message: 'Bạn đã ứng tuyển vào tin này rồi.' });
    }

    // Dung CV moi upload (neu co) hoac CV da luu trong ho so
    if (req.file) {
      uploadedCVUrl = await storeUploadedFile(req.file, 'cv', candidate.id);
    }
    const cvUrl = uploadedCVUrl || candidate.cv_url;
    if (!cvUrl) {
      return res.status(400).json({ message: 'Vui lòng tải CV lên trước khi ứng tuyển.' });
    }

    const { cover_letter } = req.body;
    const applicationId = await applicationModel.create({
      jobId: req.params.jobId,
      candidateId: candidate.id,
      cvUrl,
      coverLetter: cover_letter
    });
    applicationCreated = true;

    // Tin da ung tuyen duoc theo doi trong danh sach don, khong con la tin de xem lai sau.
    try {
      await savedJobModel.unsaveJob(candidate.id, req.params.jobId);
    } catch (cleanupError) {
      console.error('applyToJob saved-job cleanup error:', cleanupError);
    }

    res.status(201).json({ message: 'Ứng tuyển thành công!', applicationId });
  } catch (err) {
    if (uploadedCVUrl && !applicationCreated) {
      await deleteStoredFile(uploadedCVUrl).catch(() => {});
    }
    console.error('applyToJob error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// GET /api/applications/job/:jobId - doanh nghiep xem danh sach ung vien cua 1 tin
async function getApplicationsForJob(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });

    const job = await jobModel.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Không tìm thấy tin tuyển dụng.' });
    if (job.company_id !== company.id) {
      return res.status(403).json({ message: 'Bạn không có quyền xem ứng viên của tin này.' });
    }

    const status = String(req.query.status || '').trim();
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Bộ lọc trạng thái không hợp lệ.' });
    }

    const allowedSorts = ['newest', 'oldest', 'ai_desc'];
    const sort = allowedSorts.includes(req.query.sort) ? req.query.sort : 'newest';
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search || '').trim().slice(0, 100);
    const skill = String(req.query.skill || '').trim().slice(0, 100);

    const result = await applicationModel.searchByJob(req.params.jobId, {
      status, sort, page, limit, search, skill
    });
    result.applications = await withAccessibleCVUrls(result.applications);
    res.json({
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    });
  } catch (err) {
    console.error('getApplicationsForJob error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// PUT /api/applications/:id/status - doanh nghiep cap nhat trang thai pipeline
async function updateApplicationStatus(req, res) {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Trạng thái không hợp lệ. Cho phép: ${VALID_STATUSES.join(', ')}` });
    }

    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });

    const application = await applicationModel.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng tuyển.' });
    if (application.company_id !== company.id) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật hồ sơ ứng tuyển này.' });
    }

    if (application.status === status) {
      return res.json({ message: 'Hồ sơ đã ở trạng thái này.', application });
    }

    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[application.status] || [];
    if (!allowedNextStatuses.includes(status)) {
      return res.status(409).json({
        message: `Không thể chuyển trực tiếp từ “${application.status}” sang “${status}”.`,
        allowed_statuses: allowedNextStatuses
      });
    }

    const confirmReopen = req.body.confirm_reopen === true || req.body.confirm_reopen === 'true';
    if (TERMINAL_STATUSES.includes(application.status) && !confirmReopen) {
      return res.status(409).json({
        message: 'Hồ sơ đã kết thúc. Cần xác nhận mở lại trước khi tiếp tục xử lý.',
        confirmation_required: true
      });
    }

    const note = String(req.body.note || '').trim();
    if (status === 'rejected' && note.length < 3) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do từ chối ứng viên.' });
    }
    if (note.length > 1000) {
      return res.status(400).json({ message: 'Ghi chú trạng thái không được vượt quá 1000 ký tự.' });
    }

    await applicationModel.updateStatus(req.params.id, status, {
      previousStatus: application.status,
      note,
      changedByUserId: req.user.id
    });
    res.json({ message: 'Đã cập nhật trạng thái ứng viên.' });
  } catch (err) {
    console.error('updateApplicationStatus error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function getApplicationStatusHistory(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });

    const application = await applicationModel.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng tuyển.' });
    if (application.company_id !== company.id) {
      return res.status(403).json({ message: 'Bạn không có quyền xem lịch sử hồ sơ này.' });
    }

    const history = await applicationModel.findStatusHistory(req.params.id);
    res.json(history);
  } catch (err) {
    console.error('getApplicationStatusHistory error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// GET /api/applications/stats - thong ke so luong ung vien theo trang thai (company dashboard)
async function getStats(req, res) {
  try {
    const company = await companyModel.findByUserId(req.user.id);
    if (!company) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });

    const stats = await applicationModel.countByCompanyAndStatus(company.id);
    res.json(stats);
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

module.exports = {
  applyToJob, getApplicationsForJob, updateApplicationStatus,
  getApplicationStatusHistory, getStats
};
