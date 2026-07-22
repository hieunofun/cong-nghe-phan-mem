// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const paymentController = require('../controllers/paymentController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Tat ca route admin deu yeu cau dang nhap voi vai tro 'admin'
router.use(verifyToken, requireRole('admin'));

router.get('/stats', adminController.getStats);

router.get('/companies', adminController.getCompanies);
router.put('/companies/:id/approve', adminController.approveCompany);
router.put('/companies/:id/reject', adminController.rejectCompany);

router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.setUserStatus);

router.get('/candidates', adminController.getCandidates);

router.get('/jobs', adminController.getAllJobs);
router.delete('/jobs/:id', adminController.deleteAnyJob);

router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Doanh thu & thanh toan
router.get('/revenue', paymentController.adminGetRevenue);
router.get('/payments', paymentController.adminGetPayments);
router.put('/payments/:id/approve', paymentController.adminApprovePayment);
router.put('/payments/:id/reject', paymentController.adminRejectPayment);

module.exports = router;
