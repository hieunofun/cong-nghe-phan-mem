// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Public: danh sach goi
router.get('/packages', paymentController.getPackages);

// Company: mua goi, xem lich su
router.post('/purchase', verifyToken, requireRole('company'), paymentController.purchasePackage);
router.get('/my', verifyToken, requireRole('company'), paymentController.getMyPayments);
router.get('/subscription', verifyToken, requireRole('company'), paymentController.getMySubscription);
router.get('/history', verifyToken, requireRole('company'), paymentController.getSubscriptionHistory);

module.exports = router;
