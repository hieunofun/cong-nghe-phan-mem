// routes/cvSearchRoutes.js
const express = require('express');
const router = express.Router();
const cvSearchController = require('../controllers/cvSearchController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, requireRole('company'), cvSearchController.searchCandidates);
router.get('/:id', verifyToken, requireRole('company'), cvSearchController.viewCandidateDetail);

module.exports = router;
