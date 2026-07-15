// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/register/candidate', authController.registerCandidate);
router.post('/register/company', authController.registerCompany);
router.post('/login', authController.login);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
