// routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Kiem tra trang thai AI service (public)
router.get('/health', aiController.getAIHealth);

// Chatbot - khong can dang nhap
router.post('/chat', aiController.chat);

// Matching: ung vien xem diem phu hop voi 1 tin cu the
router.get('/match/:jobId', verifyToken, requireRole('candidate'), aiController.matchCVToJob);

// Recommendation: goi y viec lam cho ung vien
router.get('/recommend', verifyToken, requireRole('candidate'), aiController.recommendJobs);

// Phan tich CV cua chinh ung vien
router.get('/analyze-cv', verifyToken, requireRole('candidate'), aiController.analyzeMyCV);

// Company/Admin phan tich CV cua 1 ung vien cu the
router.get('/analyze-cv/:candidateId',
  verifyToken, requireRole('company', 'admin'),
  aiController.analyzeCandidateCV
);

module.exports = router;
