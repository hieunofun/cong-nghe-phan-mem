// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryModel = require('../models/categoryModel');

// Public: lay danh sach nganh nghe (dung cho bo loc tim viec va form dang tin)
router.get('/', async (req, res) => {
  try {
    const categories = await categoryModel.getAll();
    res.json(categories);
  } catch (err) {
    console.error('getCategories (public) error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
});

module.exports = router;
