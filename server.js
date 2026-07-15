// server.js
require('dotenv').config();
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

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin ? req.headers.origin.replace(/\/$/, '') : '';
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session chi dung cho OAuth redirect (khong luu phien dang nhap thuong)
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'joblink_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 5 * 60 * 1000 } // 5 phut - chi du cho OAuth flow
}));

app.use(passport.initialize());
app.use(passport.session());

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
app.use(express.static(path.join(__dirname, 'public')));

// Bat loi JSON
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Du lieu gui len khong dung dinh dang JSON.' });
  }
  next(err);
});

// Bat loi chung
app.use((err, req, res, next) => {
  console.error('Loi khong xu ly duoc:', err);
  res.status(500).json({ message: 'Da xay ra loi khong mong muon tren server.' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`JobLink server dang chay tai http://localhost:${PORT}`);
    console.log('OAuth providers:');
  });
}

module.exports = app;
