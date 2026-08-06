// controllers/adminController.js
const pool = require('../config/db');
const userModel = require('../models/userModel');
const companyModel = require('../models/companyModel');
const candidateModel = require('../models/candidateModel');
const jobModel = require('../models/jobModel');
const categoryModel = require('../models/categoryModel');
const { safeDbNumber } = require('../utils/dbNumbers');

// GET /api/admin/stats - so lieu tong quan cho dashboard admin
async function getStats(req, res) {
  try {
    const [[stats]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM companies) AS total_companies,
        (SELECT COUNT(*) FROM companies WHERE status = 'pending') AS pending_companies,
        (SELECT COUNT(*) FROM candidates) AS total_candidates,
        (SELECT COUNT(*) FROM jobs) AS total_jobs,
        (SELECT COUNT(*) FROM jobs WHERE status = 'active') AS active_jobs,
        (SELECT COUNT(*) FROM applications) AS total_applications
    `);

    res.json({
      totalUsers: safeDbNumber(stats, 'total_users'),
      totalCompanies: safeDbNumber(stats, 'total_companies'),
      pendingCompanies: safeDbNumber(stats, 'pending_companies'),
      totalCandidates: safeDbNumber(stats, 'total_candidates'),
      totalJobs: safeDbNumber(stats, 'total_jobs'),
      activeJobs: safeDbNumber(stats, 'active_jobs'),
      totalApplications: safeDbNumber(stats, 'total_applications')
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// --- Quan ly doanh nghiep ---
async function getCompanies(req, res) {
  try {
    const companies = await companyModel.getAll({ status: req.query.status });
    res.json(companies);
  } catch (err) {
    console.error('getCompanies error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function approveCompany(req, res) {
  try {
    await companyModel.updateStatus(req.params.id, 'approved');
    res.json({ message: 'Đã duyệt hồ sơ doanh nghiệp.' });
  } catch (err) {
    console.error('approveCompany error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function rejectCompany(req, res) {
  try {
    await companyModel.updateStatus(req.params.id, 'rejected');
    res.json({ message: 'Đã từ chối hồ sơ doanh nghiệp.' });
  } catch (err) {
    console.error('rejectCompany error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// --- Quan ly tai khoan / ung vien ---
async function getUsers(req, res) {
  try {
    const users = await userModel.getAllUsers();
    res.json(users);
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function setUserStatus(req, res) {
  try {
    const { status } = req.body;
    if (!['active', 'banned'].includes(status)) {
      return res.status(400).json({ message: "Trạng thái chỉ có thể là 'active' hoặc 'banned'." });
    }
    await userModel.updateStatus(req.params.id, status);
    res.json({ message: 'Đã cập nhật trạng thái tài khoản.' });
  } catch (err) {
    console.error('setUserStatus error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function getCandidates(req, res) {
  try {
    const candidates = await candidateModel.getAll();
    res.json(candidates);
  } catch (err) {
    console.error('getCandidates error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// --- Quan ly tin tuyen dung (toan he thong) ---
async function getAllJobs(req, res) {
  try {
    const jobs = await jobModel.getAllForAdmin();
    res.json(jobs);
  } catch (err) {
    console.error('getAllJobs error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function deleteAnyJob(req, res) {
  try {
    await jobModel.deleteJob(req.params.id);
    res.json({ message: 'Đã xóa tin tuyển dụng.' });
  } catch (err) {
    console.error('deleteAnyJob error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// --- Quan ly nganh nghe ---
async function getCategories(req, res) {
  try {
    const categories = await categoryModel.getAll();
    res.json(categories);
  } catch (err) {
    console.error('getCategories error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function createCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Vui lòng nhập tên ngành nghề.' });

    const slug = name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const id = await categoryModel.create({ name, slug });
    res.status(201).json({ message: 'Đã thêm ngành nghề mới.', id });
  } catch (err) {
    console.error('createCategory error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function deleteCategory(req, res) {
  try {
    await categoryModel.remove(req.params.id);
    res.json({ message: 'Đã xóa ngành nghề.' });
  } catch (err) {
    console.error('deleteCategory error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

module.exports = {
  getStats, getCompanies, approveCompany, rejectCompany,
  getUsers, setUserStatus, getCandidates,
  getAllJobs, deleteAnyJob,
  getCategories, createCategory, deleteCategory
};
