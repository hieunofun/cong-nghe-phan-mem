// routes/applicationRoutes.js
const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadCV, handleUploadError } = require('../middleware/upload');

// Ung vien ung tuyen vao 1 tin (co the gui kem CV moi, hoac dung CV co san trong ho so)
router.post(
  '/:jobId',
  verifyToken, requireRole('candidate'),
  uploadCV.single('cv'), handleUploadError,
  applicationController.applyToJob
);

// Doanh nghiep xem thong ke nhanh
router.get('/stats', verifyToken, requireRole('company'), applicationController.getStats);

// Doanh nghiep xem danh sach ung vien cua 1 tin
router.get('/job/:jobId', verifyToken, requireRole('company'), applicationController.getApplicationsForJob);

// Doanh nghiep cap nhat trang thai pipeline cua 1 ho so ung tuyen
router.put('/:id/status', verifyToken, requireRole('company'), applicationController.updateApplicationStatus);

module.exports = router;
