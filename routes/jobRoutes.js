// routes/jobRoutes.js
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { verifyToken, requireRole } = require('../middleware/auth');

// --- Public: tim kiem va xem tin tuyen dung ---
router.get('/', jobController.getJobs);
router.get('/featured', jobController.getFeatured);

// --- Company: quan ly tin cua minh (dat truoc '/:id' de tranh xung dot route) ---
router.get('/company/my-jobs', verifyToken, requireRole('company'), jobController.getMyJobs);
router.post('/', verifyToken, requireRole('company'), jobController.createJob);

// --- Public: chi tiet 1 tin (dat sau cac route co dinh ben tren) ---
router.get('/:id', jobController.getJobById);

// --- Company: sua / xoa tin cua minh ---
router.put('/:id', verifyToken, requireRole('company'), jobController.updateJob);
router.delete('/:id', verifyToken, requireRole('company'), jobController.deleteJob);

module.exports = router;
