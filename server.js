// server.js
require('dotenv').config();

if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET', 'SUPABASE_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push('SUPABASE_SECRET_KEY');
  }
  if (!process.env.AI_SERVICE_URL && !process.env.AI_SERVICE_HOST) {
    missing.push('AI_SERVICE_URL/AI_SERVICE_HOST');
  }
  if (missing.length) {
    throw new Error(`Thiếu biến môi trường production: ${missing.join(', ')}`);
  }
}
const path = require('path');
const express = require('express');
const session = require('express-session');

require('./config/db');

const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const oauthRoutes = require('./routes/oauthRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const companyRoutes = require('./routes/companyRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const cvSearchRoutes = require('./routes/cvSearchRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session chi dung cho OAuth redirect (khong luu phien dang nhap thuong)
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'joblink_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 5 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  } // 5 phut - chi du cho OAuth flow
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'joblink-web' });
});

// File da upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes);   // /api/auth/google, /github, /facebook
app.use('/api/candidates', candidateRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cv-search', cvSearchRoutes);
app.use('/api/ai', aiRoutes);

// Frontend tinh
app.get('/packages', (req, res) => res.redirect('/packages.html'));
app.get('/packages-preview.html', (req, res) => res.redirect('/packages.html'));
app.use(express.static(path.join(__dirname, 'public')));

// Bat loi JSON
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Dữ liệu gửi lên không đúng định dạng JSON.' });
  }
  next(err);
});

// Bat loi chung
app.use((err, req, res, next) => {
  console.error('Lỗi không xử lý được:', err);
  res.status(500).json({ message: 'Đã xảy ra lỗi không mong muốn trên server.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`JobLink server đang chạy tại http://localhost:${PORT}`);
  console.log('OAuth providers:');
});
