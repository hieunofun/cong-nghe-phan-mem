// controllers/authController.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const passwordResetModel = require('../models/passwordResetModel');
const companyModel = require('../models/companyModel');
const candidateModel = require('../models/candidateModel');
const { isMailConfigured, sendPasswordResetEmail } = require('../services/mailService');
const { getConfiguredBaseUrl } = require('../utils/appUrl');

const TERMS_VERSION = '2026-07-21';
const PASSWORD_RESET_MINUTES = 30;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function passwordValidationMessage(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Mật khẩu phải có ít nhất 8 ký tự.';
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'Mật khẩu phải có chữ hoa, chữ thường và chữ số.';
  }
  return '';
}

function resetBaseUrl(req) {
  const configuredBaseUrl = getConfiguredBaseUrl();
  if (process.env.NODE_ENV === 'production' && configuredBaseUrl) return configuredBaseUrl;
  return `${req.protocol}://${req.get('host')}`;
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
    const { password, terms_accepted } = req.body;
    const email = normalizeEmail(req.body.email);
    const fullName = String(req.body.full_name || '').trim();

    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email, mật khẩu và họ tên.' });
    }
    if (fullName.length > 150) {
      return res.status(400).json({ message: 'Họ và tên không được vượt quá 150 ký tự.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Email không hợp lệ.' });
    }
    const passwordError = passwordValidationMessage(password);
    if (passwordError) return res.status(400).json({ message: passwordError });
    if (terms_accepted !== true) {
      return res.status(400).json({ message: 'Bạn cần đồng ý với Điều khoản sử dụng và Chính sách bảo mật.' });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email này đã được sử dụng.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await userModel.createUser({
      email,
      hashedPassword,
      role: 'candidate',
      status: 'active',
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION
    });
    await candidateModel.createCandidate({ userId, fullName });

    const token = signToken({ id: userId, role: 'candidate', email });
    res.status(201).json({
      message: 'Đăng ký ứng viên thành công!',
      token,
      user: { id: userId, email, role: 'candidate' }
    });
  } catch (err) {
    console.error('registerCandidate error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// Dang ky doanh nghiep: POST /api/auth/register/company
async function registerCompany(req, res) {
  try {
    const { password, company_name, tax_code, address, terms_accepted } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || !password || !company_name) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email, mật khẩu và tên công ty.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Email không hợp lệ.' });
    }
    const passwordError = passwordValidationMessage(password);
    if (passwordError) return res.status(400).json({ message: passwordError });
    if (terms_accepted !== true) {
      return res.status(400).json({ message: 'Bạn cần đồng ý với Điều khoản sử dụng và Chính sách bảo mật.' });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email này đã được sử dụng.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Tai khoan cong ty can admin duyet -> status 'pending'
    const userId = await userModel.createUser({
      email,
      hashedPassword,
      role: 'company',
      status: 'active',
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION
    });
    await companyModel.createCompany({ userId, companyName: company_name, taxCode: tax_code, address });

    const token = signToken({ id: userId, role: 'company', email });
    res.status(201).json({
      message: 'Đăng ký doanh nghiệp thành công! Hồ sơ của bạn đang chờ Admin duyệt trước khi đăng tin tuyển dụng.',
      token,
      user: { id: userId, email, role: 'company' }
    });
  } catch (err) {
    console.error('registerCompany error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// Dang nhap chung cho 3 vai tro: POST /api/auth/login
async function login(req, res) {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);
    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    const token = signToken(user);
    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email hợp lệ.' });
    }

    const response = {
      message: 'Nếu email tồn tại trong hệ thống, JobLink đã tạo hướng dẫn đặt lại mật khẩu.'
    };
    const user = await userModel.findByEmail(email);

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000);
      const resetUrl = `${resetBaseUrl(req)}/reset-password.html?token=${token}`;

      await passwordResetModel.invalidateForUser(user.id);
      await passwordResetModel.create({ userId: user.id, tokenHash, expiresAt });

      let emailSent = false;
      try {
        emailSent = await sendPasswordResetEmail({ to: email, resetUrl });
      } catch (mailError) {
        console.error('sendPasswordResetEmail error:', mailError.message);
      }

      if (process.env.NODE_ENV !== 'production' && (!isMailConfigured() || !emailSent)) {
        response.reset_url = resetUrl;
      }
    }

    res.json(response);
  } catch (err) {
    console.error('forgotPassword error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
    }

    const passwordError = passwordValidationMessage(password);
    if (passwordError) return res.status(400).json({ message: passwordError });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetRecord = await passwordResetModel.findValidByHash(tokenHash);
    if (!resetRecord) {
      return res.status(400).json({ message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
    }

    const consumed = await passwordResetModel.consume(resetRecord.id);
    if (!consumed) {
      return res.status(400).json({ message: 'Liên kết đặt lại mật khẩu đã được sử dụng.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await userModel.updatePassword(resetRecord.user_id, hashedPassword);
    res.json({ message: 'Cập nhật mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// Lay thong tin tai khoan dang dang nhap: GET /api/auth/me
async function getMe(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });

    let profile = null;
    if (user.role === 'candidate') {
      profile = await candidateModel.findByUserId(user.id);
    } else if (user.role === 'company') {
      profile = await companyModel.findByUserId(user.id);
    }

    res.json({ user, profile });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
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
