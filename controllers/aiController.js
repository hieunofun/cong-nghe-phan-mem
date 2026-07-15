// controllers/aiController.js
// Bridge giua Node.js backend va Flask AI Service (port 5000)
// Neu Flask chua chay, tra ve loi nhe khong anh huong tinh nang khac

const http = require('http');
const candidateModel = require('../models/candidateModel');
const jobModel = require('../models/jobModel');
const companyModel = require('../models/companyModel');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000';
const AI_TIMEOUT_MS = 30000; // RAG co the can them thoi gian de doc DB va goi Groq

// ── HELPER: Goi Flask AI service ──────────────────────────────
function callAI(endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url = new URL(AI_SERVICE_URL + endpoint);

    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: AI_TIMEOUT_MS
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Phan hoi AI khong hop le')); }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('AI service timeout - kiem tra Flask dang chay chua'));
    });
    req.on('error', (err) => {
      reject(new Error('Khong ket noi duoc AI service. Vui long chay: python ai_service/app.py'));
    });

    req.write(payload);
    req.end();
  });
}

function aiUnavailable(res, err) {
  return res.status(503).json({
    message: 'AI Service chua san sang. ' + (err?.message || ''),
    ai_offline: true
  });
}

// ── 1. KIEM TRA TRANG THAI AI SERVICE ─────────────────────────
async function getAIHealth(req, res) {
  try {
    const resp = await new Promise((resolve, reject) => {
      const url = new URL(AI_SERVICE_URL + '/health');
      const req2 = http.get({ hostname: url.hostname, port: url.port || 5000, path: '/health', timeout: 3000 }, (r) => {
        let d = '';
        r.on('data', c => { d += c; });
        r.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
      });
      req2.on('error', reject);
      req2.on('timeout', () => { req2.destroy(); reject(new Error('timeout')); });
    });
    res.json({ online: true, ...resp });
  } catch (err) {
    res.json({ online: false, message: 'AI Service chua chay (python ai_service/app.py)' });
  }
}

// ── 2. CHAM DIEM CV-JOB MATCHING ──────────────────────────────
// GET /api/ai/match/:jobId — ung vien xem diem phu hop voi 1 tin
async function matchCVToJob(req, res) {
  try {
    const candidate = await candidateModel.findByUserId(req.user.id);
    if (!candidate) return res.status(404).json({ message: 'Khong tim thay ho so ung vien.' });
    if (!candidate.cv_url && !candidate.skills && !candidate.experience) {
      return res.status(400).json({ message: 'Vui long cap nhat ho so (ky nang, kinh nghiem) de su dung tinh nang nay.' });
    }

    const job = await jobModel.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Khong tim thay tin tuyen dung.' });

    const cvText = [
      candidate.full_name || '',
      candidate.skills || '',
      candidate.experience || '',
      candidate.education || ''
    ].join(' ').trim();

    const jobText = [
      job.title,
      job.description || '',
      job.requirements || ''
    ].join(' ').trim();

    const result = await callAI('/match', { cv_text: cvText, job_text: jobText });
    res.json(result);
  } catch (err) {
    if (err.message.includes('ket noi') || err.message.includes('timeout')) return aiUnavailable(res, err);
    console.error('matchCVToJob error:', err);
    res.status(500).json({ message: 'Loi server.' });
  }
}

// ── 3. GOI Y VIEC LAM CHO UNG VIEN ───────────────────────────
// GET /api/ai/recommend — goi y tin phu hop cho ung vien dang dang nhap
async function recommendJobs(req, res) {
  try {
    const candidate = await candidateModel.findByUserId(req.user.id);
    if (!candidate) return res.status(404).json({ message: 'Khong tim thay ho so ung vien.' });

    const candidateText = [
      candidate.skills || '',
      candidate.experience || '',
      candidate.education || ''
    ].join(' ').trim();

    if (!candidateText) {
      return res.status(400).json({ message: 'Ho so cua ban chua co ky nang hoac kinh nghiem. Vui long cap nhat ho so truoc.' });
    }

    // Lay 30 tin active gan nhat de tinh recommendation
    const { jobs } = await jobModel.search({ page: 1, limit: 30 });
    if (!jobs.length) return res.json({ recommendations: [] });

    const jobsForAI = jobs.map(j => ({
      id: j.id,
      title: j.title,
      description: (j.description || '').slice(0, 300)
    }));

    const result = await callAI('/recommend', {
      candidate_text: candidateText,
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

    res.json({ recommendations: enriched });
  } catch (err) {
    if (err.message.includes('ket noi') || err.message.includes('timeout')) return aiUnavailable(res, err);
    console.error('recommendJobs error:', err);
    res.status(500).json({ message: 'Loi server.' });
  }
}

// ── 4. PHAN TICH CV UNG VIEN ──────────────────────────────────
// GET /api/ai/analyze-cv — ung vien phan tich CV cua chinh minh
async function analyzeMyCV(req, res) {
  try {
    const candidate = await candidateModel.findByUserId(req.user.id);
    if (!candidate) return res.status(404).json({ message: 'Khong tim thay ho so ung vien.' });

    const cvText = [
      candidate.full_name || '',
      candidate.skills || '',
      candidate.experience || '',
      candidate.education || ''
    ].join(' ').trim();

    if (!cvText || cvText.length < 30) {
      return res.status(400).json({ message: 'Ho so qua it thong tin. Vui long dien day du ky nang, kinh nghiem va hoc van truoc khi phan tich.' });
    }

    const result = await callAI('/analyze-cv', { cv_text: cvText });
    res.json(result);
  } catch (err) {
    if (err.message.includes('ket noi') || err.message.includes('timeout')) return aiUnavailable(res, err);
    console.error('analyzeMyCV error:', err);
    res.status(500).json({ message: 'Loi server.' });
  }
}

// GET /api/ai/analyze-cv/:candidateId — company/admin phan tich CV cua ung vien cu the
async function analyzeCandidateCV(req, res) {
  try {
    const candidate = await candidateModel.findById(req.params.candidateId);
    if (!candidate) return res.status(404).json({ message: 'Khong tim thay ung vien.' });

    const cvText = [
      candidate.full_name || '',
      candidate.skills || '',
      candidate.experience || '',
      candidate.education || ''
    ].join(' ').trim();

    if (!cvText || cvText.length < 20) {
      return res.status(400).json({ message: 'Ung vien nay chua co du thong tin de phan tich.' });
    }

    const result = await callAI('/analyze-cv', { cv_text: cvText });
    res.json({ candidate_name: candidate.full_name, ...result });
  } catch (err) {
    if (err.message.includes('ket noi') || err.message.includes('timeout')) return aiUnavailable(res, err);
    console.error('analyzeCandidateCV error:', err);
    res.status(500).json({ message: 'Loi server.' });
  }
}

// ── 5. CHATBOT TU VAN NGHE NGHIEP ────────────────────────────
// POST /api/ai/chat — bat ky ai cung co the dung (khong can dang nhap)
async function chat(req, res) {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Vui long nhap tin nhan.' });
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
    if (err.message.includes('ket noi') || err.message.includes('timeout')) return aiUnavailable(res, err);
    console.error('chat error:', err);
    res.status(500).json({ message: 'Loi server.' });
  }
}

module.exports = {
  getAIHealth,
  matchCVToJob,
  recommendJobs,
  analyzeMyCV,
  analyzeCandidateCV,
  chat
};
