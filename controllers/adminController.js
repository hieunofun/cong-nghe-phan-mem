// controllers/adminController.js
const pool = require('../config/db');
const userModel = require('../models/userModel');
const companyModel = require('../models/companyModel');
const candidateModel = require('../models/candidateModel');
const jobModel = require('../models/jobModel');
const categoryModel = require('../models/categoryModel');

// GET /api/admin/stats - so lieu tong quan cho dashboard admin
async function getStats(req, res) {
  try {
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
    const [[{ totalCompanies }]] = await pool.query('SELECT COUNT(*) AS totalCompanies FROM companies');
    const [[{ pendingCompanies }]] = await pool.query(
      "SELECT COUNT(*) AS pendingCompanies FROM companies WHERE status = 'pending'"
    );
    const [[{ totalCandidates }]] = await pool.query('SELECT COUNT(*) AS totalCandidates FROM candidates');
    const [[{ totalJobs }]] = await pool.query('SELECT COUNT(*) AS totalJobs FROM jobs');
    const [[{ activeJobs }]] = await pool.query("SELECT COUNT(*) AS activeJobs FROM jobs WHERE status = 'active'");
    const [[{ totalApplications }]] = await pool.query('SELECT COUNT(*) AS totalApplications FROM applications');

    res.json({
      totalUsers, totalCompanies, pendingCompanies,
      totalCandidates, totalJobs, activeJobs, totalApplications
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// --- Quan ly doanh nghiep ---
async function getCompanies(req, res) {
  try {
    const companies = await companyModel.getAll({ status: req.query.status });
    res.json(companies);
  } catch (err) {
    console.error('getCompanies error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function approveCompany(req, res) {
  try {
    await companyModel.updateStatus(req.params.id, 'approved');
    res.json({ message: 'Da duyet ho so doanh nghiep.' });
  } catch (err) {
    console.error('approveCompany error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function rejectCompany(req, res) {
  try {
    await companyModel.updateStatus(req.params.id, 'rejected');
    res.json({ message: 'Da tu choi ho so doanh nghiep.' });
  } catch (err) {
    console.error('rejectCompany error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// --- Quan ly tai khoan / ung vien ---
async function getUsers(req, res) {
  try {
    const users = await userModel.getAllUsers();
    res.json(users);
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function setUserStatus(req, res) {
  try {
    const { status } = req.body;
    if (!['active', 'banned'].includes(status)) {
      return res.status(400).json({ message: "Trang thai chi co the la 'active' hoac 'banned'." });
    }
    await userModel.updateStatus(req.params.id, status);
    res.json({ message: 'Da cap nhat trang thai tai khoan.' });
  } catch (err) {
    console.error('setUserStatus error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function getCandidates(req, res) {
  try {
    const candidates = await candidateModel.getAll();
    res.json(candidates);
  } catch (err) {
    console.error('getCandidates error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// --- Quan ly tin tuyen dung (toan he thong) ---
async function getAllJobs(req, res) {
  try {
    const jobs = await jobModel.getAllForAdmin();
    res.json(jobs);
  } catch (err) {
    console.error('getAllJobs error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function deleteAnyJob(req, res) {
  try {
    await jobModel.deleteJob(req.params.id);
    res.json({ message: 'Da xoa tin tuyen dung.' });
  } catch (err) {
    console.error('deleteAnyJob error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// --- Quan ly nganh nghe ---
async function getCategories(req, res) {
  try {
    const categories = await categoryModel.getAll();
    res.json(categories);
  } catch (err) {
    console.error('getCategories error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function createCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Vui long nhap ten nganh nghe.' });

    const slug = name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const id = await categoryModel.create({ name, slug });
    res.status(201).json({ message: 'Da them nganh nghe moi.', id });
  } catch (err) {
    console.error('createCategory error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function deleteCategory(req, res) {
  try {
    await categoryModel.remove(req.params.id);
    res.json({ message: 'Da xoa nganh nghe.' });
  } catch (err) {
    console.error('deleteCategory error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

module.exports = {
  getStats, getCompanies, approveCompany, rejectCompany,
  getUsers, setUserStatus, getCandidates,
  getAllJobs, deleteAnyJob,
  getCategories, createCategory, deleteCategory
};
