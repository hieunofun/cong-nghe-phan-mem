// controllers/aiController.js
// Bridge giua Node.js backend va Flask AI Service (port 5000)
// Neu Flask chua chay, tra ve loi nhe khong anh huong tinh nang khac

const candidateModel = require('../models/candidateModel');
const jobModel = require('../models/jobModel');
const companyModel = require('../models/companyModel');
const applicationModel = require('../models/applicationModel');
const { buildCandidateAIText } = require('../utils/cvTextExtractor');
const { callAI, getAIHealth: fetchAIHealth } = require('../services/aiServiceClient');

function aiUnavailable(res, err) {
  return res.status(503).json({
    message: 'Dịch vụ AI chưa sẵn sàng. ' + (err?.message || ''),
    ai_offline: true
  });
}

function handleAIControllerError(res, err, label) {
  if (
    ['AI_CONFIG_ERROR', 'AI_CONNECTION_ERROR', 'AI_TIMEOUT'].includes(err.code)
    || /kết nối|ket noi|timeout|hết thời gian|cấu hình địa chỉ/i.test(err.message)
  ) {
    return aiUnavailable(res, err);
  }
  if (err.aiStatus) {
    return res.status(err.aiStatus).json({
      ...err.aiPayload,
      message: err.aiPayload?.message || err.aiPayload?.error || err.message
    });
  }
  console.error(`${label} error:`, err);
  return res.status(500).json({ message: 'Lỗi máy chủ.' });
}

// ── 1. KIEM TRA TRANG THAI AI SERVICE ─────────────────────────
async function getAIHealth(req, res) {
  try {
    const resp = await fetchAIHealth();
    res.json({ online: true, ...resp });
  } catch (err) {
    console.error('getAIHealth error:', err.message);
    res.json({ online: false, message: 'Dịch vụ AI chưa sẵn sàng hoặc cấu hình kết nối chưa đúng.' });
  }
}

// ── 2. CHAM DIEM CV-JOB MATCHING ──────────────────────────────
// GET /api/ai/match/:jobId — ung vien xem diem phu hop voi 1 tin
async function matchCVToJob(req, res) {
  try {
    const candidate = await candidateModel.findByUserId(req.user.id);
    if (!candidate) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng viên.' });
    const candidateInput = await buildCandidateAIText(candidate);
    if (candidateInput.text.length < 20) {
      return res.status(400).json({ message: 'Vui lòng tải CV PDF/DOCX hoặc cập nhật kỹ năng, kinh nghiệm để sử dụng tính năng này.' });
    }

    const job = await jobModel.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Không tìm thấy tin tuyển dụng.' });

    const jobText = [
      job.title,
      job.description || '',
      job.requirements || ''
    ].join(' ').trim();

    const result = await callAI('/match', { cv_text: candidateInput.text, job_text: jobText });
    res.json({ ...result, input_source: candidateInput.source, cv_read_warning: candidateInput.warning });
  } catch (err) {
    return handleAIControllerError(res, err, 'matchCVToJob');
  }
}

// ── 3. GOI Y VIEC LAM CHO UNG VIEN ───────────────────────────
// GET /api/ai/recommend — goi y tin phu hop cho ung vien dang dang nhap
async function recommendJobs(req, res) {
  try {
    const candidate = await candidateModel.findByUserId(req.user.id);
    if (!candidate) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng viên.' });
    const candidateInput = await buildCandidateAIText(candidate);
    if (candidateInput.text.length < 20) {
      return res.status(400).json({ message: 'Vui lòng tải CV PDF/DOCX hoặc cập nhật kỹ năng, kinh nghiệm trước.' });
    }

    // Lay 30 tin active gan nhat de tinh recommendation
    const { jobs } = await jobModel.search({ page: 1, limit: 30 });
    if (!jobs.length) return res.json({ recommendations: [] });

    const jobsForAI = jobs.map(j => ({
      id: j.id,
      title: j.title,
      description: (j.description || '').slice(0, 800),
      requirements: (j.requirements || '').slice(0, 800)
    }));

    const result = await callAI('/recommend', {
      candidate_text: candidateInput.text,
      jobs: jobsForAI
    });

    // Gan them thong tin day du cua tung job vao ket qua
    const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));
    const enriched = (result.recommendations || [])
      .filter(r => r.score >= 30) // Loc bo tin qua thap
      .slice(0, 8)
      .map(r => ({
        ...r,
        job: jobMap[r.job_id] || null
      }))
      .filter(r => r.job !== null);

    res.json({
      recommendations: enriched,
      backend: result.backend,
      input_source: candidateInput.source,
      cv_read_warning: candidateInput.warning
    });
  } catch (err) {
    return handleAIControllerError(res, err, 'recommendJobs');
  }
}

// ── 4. PHAN TICH CV UNG VIEN ──────────────────────────────────
// GET /api/ai/analyze-cv — ung vien phan tich CV cua chinh minh
async function analyzeMyCV(req, res) {
  try {
    const candidate = await candidateModel.findByUserId(req.user.id);
    if (!candidate) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng viên.' });
    const candidateInput = await buildCandidateAIText(candidate, null, { includeProfileWithCV: false });
    if (candidateInput.text.length < 30) {
      return res.status(400).json({
        message: candidateInput.warning || 'CV/hồ sơ có quá ít thông tin. Vui lòng tải CV PDF/DOCX hoặc điền đầy đủ hồ sơ.'
      });
    }

    const result = await callAI('/analyze-cv', { cv_text: candidateInput.text });
    res.json({ ...result, input_source: candidateInput.source, cv_read_warning: candidateInput.warning });
  } catch (err) {
    return handleAIControllerError(res, err, 'analyzeMyCV');
  }
}

// GET /api/ai/analyze-cv/:candidateId — company/admin phan tich CV cua ung vien cu the
async function analyzeCandidateCV(req, res) {
  try {
    const candidate = await candidateModel.findById(req.params.candidateId);
    if (!candidate) return res.status(404).json({ message: 'Không tìm thấy ứng viên.' });
    const candidateInput = await buildCandidateAIText(candidate);
    if (candidateInput.text.length < 20) {
      return res.status(400).json({ message: 'Ứng viên này chưa có đủ thông tin để phân tích.' });
    }

    const result = await callAI('/analyze-cv', { cv_text: candidateInput.text });
    res.json({
      candidate_name: candidate.full_name,
      ...result,
      input_source: candidateInput.source,
      cv_read_warning: candidateInput.warning
    });
  } catch (err) {
    return handleAIControllerError(res, err, 'analyzeCandidateCV');
  }
}

// GET /api/ai/analyze-application/:applicationId — company/admin phan tich dung CV da ung tuyen
async function analyzeApplicationCV(req, res) {
  try {
    const application = await applicationModel.findById(req.params.applicationId);
    if (!application) return res.status(404).json({ message: 'Không tìm thấy đơn ứng tuyển.' });

    if (req.user.role === 'company') {
      const company = await companyModel.findByUserId(req.user.id);
      if (!company || Number(application.company_id) !== Number(company.id)) {
        return res.status(403).json({ message: 'Bạn không có quyền phân tích đơn ứng tuyển này.' });
      }
    }

    const candidate = await candidateModel.findById(application.candidate_id);
    if (!candidate) return res.status(404).json({ message: 'Không tìm thấy ứng viên.' });

    const candidateInput = await buildCandidateAIText(candidate, application.cv_url);
    if (candidateInput.text.length < 20) {
      return res.status(400).json({ message: 'CV/hồ sơ ứng viên chưa có đủ thông tin để phân tích.' });
    }

    const jobText = [
      application.job_title,
      application.job_description || '',
      application.job_requirements || ''
    ].join(' ').trim();
    const [result, match] = await Promise.all([
      callAI('/analyze-cv', { cv_text: candidateInput.text }),
      callAI('/match', { cv_text: candidateInput.text, job_text: jobText })
    ]);
    await applicationModel.updateAIScore(application.id, {
      score: Number(match.score),
      label: match.label
    });
    res.json({
      candidate_name: candidate.full_name,
      ...result,
      match_score: Number(match.score),
      match_label: match.label,
      input_source: candidateInput.source,
      cv_read_warning: candidateInput.warning
    });
  } catch (err) {
    return handleAIControllerError(res, err, 'analyzeApplicationCV');
  }
}

// ── 5. CHATBOT TU VAN NGHE NGHIEP ────────────────────────────
// POST /api/ai/chat — bat ky ai cung co the dung (khong can dang nhap)
async function chat(req, res) {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tin nhắn.' });
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-8).map(h => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: String(h.content || '').slice(0, 800)
      })).filter(h => h.content.trim())
      : [];

    const result = await callAI('/chat', {
      message: message.trim(),
      history: safeHistory
    });
    res.json(result);
  } catch (err) {
    return handleAIControllerError(res, err, 'chat');
  }
}

module.exports = {
  getAIHealth,
  matchCVToJob,
  recommendJobs,
  analyzeMyCV,
  analyzeCandidateCV,
  analyzeApplicationCV,
  chat
};
