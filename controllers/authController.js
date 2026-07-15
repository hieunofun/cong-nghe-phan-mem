// controllers/authController.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const companyModel = require('../models/companyModel');
const candidateModel = require('../models/candidateModel');
const passwordResetModel = require('../models/passwordResetModel');
const { isValidEmail, validatePassword } = require('../utils/authValidation');

const TERMS_VERSION = '2026-07-15';
const RESET_TOKEN_MINUTES = 30;
const resetRequestTimes = new Map();

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
    const { email, password, full_name, terms_accepted } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Vui long nhap day du Email, mat khau va Ho ten.' });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Email khong hop le.' });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    if (terms_accepted !== true) {
      return res.status(400).json({ message: 'Bạn cần đồng ý với Điều khoản sử dụng và Chính sách bảo mật.' });
    }

    const existing = await userModel.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: 'Email nay da duoc su dung.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await userModel.createUser({
      email: normalizedEmail,
      hashedPassword,
      role: 'candidate',
      status: 'active',
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION
    });
    await candidateModel.createCandidate({ userId, fullName: full_name });

    const token = signToken({ id: userId, role: 'candidate', email: normalizedEmail });
    res.status(201).json({
      message: 'Dang ky ung vien thanh cong!',
      token,
      user: { id: userId, email: normalizedEmail, role: 'candidate' }
    });
  } catch (err) {
    console.error('registerCandidate error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// Dang ky doanh nghiep: POST /api/auth/register/company
async function registerCompany(req, res) {
  try {
    const { email, password, company_name, tax_code, address, terms_accepted } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!email || !password || !company_name) {
      return res.status(400).json({ message: 'Vui long nhap day du Email, mat khau va Ten cong ty.' });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Email khong hop le.' });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    if (terms_accepted !== true) {
      return res.status(400).json({ message: 'Bạn cần đồng ý với Điều khoản sử dụng và Chính sách bảo mật.' });
    }

    const existing = await userModel.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: 'Email nay da duoc su dung.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Tai khoan cong ty can admin duyet -> status 'pending'
    const userId = await userModel.createUser({
      email: normalizedEmail,
      hashedPassword,
      role: 'company',
      status: 'active',
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION
    });
    await companyModel.createCompany({ userId, companyName: company_name, taxCode: tax_code, address });

    const token = signToken({ id: userId, role: 'company', email: normalizedEmail });
    res.status(201).json({
      message: 'Dang ky doanh nghiep thanh cong! Ho so cua ban dang cho Admin duyet truoc khi dang tin tuyen dung.',
      token,
      user: { id: userId, email: normalizedEmail, role: 'company' }
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

    const user = await userModel.findByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Email hoac mat khau khong dung.' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ message: 'Tai khoan cua ban da bi khoa. Vui long lien he Admin.' });
    }

    const isMatch = user.password ? await bcrypt.compare(password, user.password) : false;
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

// Gui yeu cau dat lai mat khau. Moi truong dev tra ve link de co the demo khong can mail server.
async function forgotPassword(req, res) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const genericMessage = 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được tạo.';
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Email không hợp lệ.' });
    }

    const rateKey = `${req.ip}:${email}`;
    const lastRequest = resetRequestTimes.get(rateKey) || 0;
    if (Date.now() - lastRequest < 60 * 1000) {
      return res.json({ message: genericMessage });
    }
    resetRequestTimes.set(rateKey, Date.now());

    const user = await userModel.findByEmail(email);
    if (!user || user.status === 'banned') {
      return res.json({ message: genericMessage });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);
    await passwordResetModel.replaceToken({ userId: user.id, tokenHash, expiresAt });

    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${token}`;
    const response = { message: genericMessage, expires_in_minutes: RESET_TOKEN_MINUTES };
    if (process.env.NODE_ENV !== 'production') response.reset_url = resetUrl;
    return res.json(response);
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau.' });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (typeof token !== 'string' || token.length < 32) {
      return res.status(400).json({ message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
    }
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ message: passwordError });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const hashedPassword = await bcrypt.hash(password, 10);
    const updated = await passwordResetModel.consumeTokenAndUpdatePassword(tokenHash, hashedPassword);
    if (!updated) {
      return res.status(400).json({ message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
    }
    return res.json({ message: 'Mật khẩu đã được cập nhật. Bạn có thể đăng nhập ngay.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau.' });
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

module.exports = {
  registerCandidate,
  registerCompany,
  login,
  forgotPassword,
  resetPassword,
  getMe
};
