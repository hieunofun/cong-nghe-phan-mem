// routes/candidateRoutes.js
const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadCV, uploadAvatar, handleUploadError } = require('../middleware/upload');

// Tat ca route duoi day chi danh cho ung vien da dang nhap
router.use(verifyToken, requireRole('candidate'));

router.get('/me', candidateController.getMyProfile);
router.put('/me', candidateController.updateMyProfile);
router.post('/me/cv', uploadCV.single('cv'), handleUploadError, candidateController.uploadCV);
router.post('/me/avatar', uploadAvatar.single('avatar'), handleUploadError, candidateController.uploadAvatar);

router.get('/me/applications', candidateController.getMyApplications);

router.get('/me/saved-jobs', candidateController.getSavedJobs);
router.post('/me/saved-jobs/:jobId', candidateController.saveJob);
router.delete('/me/saved-jobs/:jobId', candidateController.unsaveJob);

module.exports = router;
