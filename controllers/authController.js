// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const companyModel = require('../models/companyModel');
const candidateModel = require('../models/candidateModel');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Dang ky ung vien: POST /api/auth/register/candidate
async function registerCandidate(req, res) {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Vui long nhap day du Email, mat khau va Ho ten.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Email khong hop le.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mat khau phai co it nhat 6 ky tu.' });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email nay da duoc su dung.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await userModel.createUser({
      email, hashedPassword, role: 'candidate', status: 'active'
    });
    await candidateModel.createCandidate({ userId, fullName: full_name });

    const token = signToken({ id: userId, role: 'candidate', email });
    res.status(201).json({
      message: 'Dang ky ung vien thanh cong!',
      token,
      user: { id: userId, email, role: 'candidate' }
    });
  } catch (err) {
    console.error('registerCandidate error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// Dang ky doanh nghiep: POST /api/auth/register/company
async function registerCompany(req, res) {
  try {
    const { email, password, company_name, tax_code, address } = req.body;

    if (!email || !password || !company_name) {
      return res.status(400).json({ message: 'Vui long nhap day du Email, mat khau va Ten cong ty.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Email khong hop le.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mat khau phai co it nhat 6 ky tu.' });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email nay da duoc su dung.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Tai khoan cong ty can admin duyet -> status 'pending'
    const userId = await userModel.createUser({
      email, hashedPassword, role: 'company', status: 'active'
    });
    await companyModel.createCompany({ userId, companyName: company_name, taxCode: tax_code, address });

    const token = signToken({ id: userId, role: 'company', email });
    res.status(201).json({
      message: 'Dang ky doanh nghiep thanh cong! Ho so cua ban dang cho Admin duyet truoc khi dang tin tuyen dung.',
      token,
      user: { id: userId, email, role: 'company' }
    });
  } catch (err) {
    console.error('registerCompany error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// Dang nhap chung cho 3 vai tro: POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Vui long nhap Email va Mat khau.' });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Email hoac mat khau khong dung.' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ message: 'Tai khoan cua ban da bi khoa. Vui long lien he Admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoac mat khau khong dung.' });
    }

    const token = signToken(user);
    res.json({
      message: 'Dang nhap thanh cong!',
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// Lay thong tin tai khoan dang dang nhap: GET /api/auth/me
async function getMe(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Khong tim thay tai khoan.' });

    let profile = null;
    if (user.role === 'candidate') {
      profile = await candidateModel.findByUserId(user.id);
    } else if (user.role === 'company') {
      profile = await companyModel.findByUserId(user.id);
    }

    res.json({ user, profile });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

module.exports = { registerCandidate, registerCompany, login, getMe };
