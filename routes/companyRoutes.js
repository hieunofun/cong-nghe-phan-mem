// routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadLogo, handleUploadError } = require('../middleware/upload');

// Xem thong tin cong khai cua 1 doanh nghiep (khong can dang nhap)
router.get('/:id', companyController.getPublicProfile);

// Cac route con lai chi danh cho doanh nghiep da dang nhap
router.use(verifyToken, requireRole('company'));

router.get('/me/profile', companyController.getMyProfile);
router.put('/me/profile', companyController.updateMyProfile);
router.post('/me/logo', uploadLogo.single('logo'), handleUploadError, companyController.uploadLogo);

module.exports = router;
