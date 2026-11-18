// server.js
require('dotenv').config();

if (process.env.NODE_ENV === 'production') {
  const isMysql = String(process.env.DB_CLIENT || '').trim().toLowerCase() === 'mysql';
  const useLocalStorage = String(process.env.STORAGE_DRIVER || '').trim().toLowerCase() === 'local';
  const required = [
    ...(isMysql ? ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'] : ['DATABASE_URL']),
    'JWT_SECRET',
    'SESSION_SECRET',
    ...(useLocalStorage ? [] : ['SUPABASE_URL']),
    'BASE_URL',
    'FRONTEND_URL'
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (!useLocalStorage && !process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push('SUPABASE_SECRET_KEY');
  }
  if (!process.env.AI_SERVICE_URL && !process.env.AI_SERVICE_HOST) {
    missing.push('AI_SERVICE_URL/AI_SERVICE_HOST');
  }
  if (missing.length) {
    throw new Error(`Thiếu biến môi trường production: ${missing.join(', ')}`);
  }
}

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const session = require('express-session');

const pool = require('./config/db');
const {
  getAlertLedger,
  metricsMiddleware,
  recordAlertNotification,
  renderPrometheusMetrics
} = require('./utils/metrics');

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
app.disable('x-powered-by');

function normalizeOrigin(value) {
  try {
    return new URL(String(value || '').trim()).origin;
  } catch (_error) {
    return '';
  }
}

const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || '').split(','),
  ...(process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:3000', 'http://127.0.0.1:3000'])
].map(normalizeOrigin).filter(Boolean));

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security headers chuan trien khai production
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

app.use(metricsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Frontend Render va API Vercel dung hai origin khac nhau.
app.use((req, res, next) => {
  const requestOrigin = normalizeOrigin(req.headers.origin);
  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    return requestOrigin && allowedOrigins.has(requestOrigin)
      ? res.sendStatus(204)
      : res.status(403).json({ message: 'Origin không được phép.' });
  }
  next();
});

const cookieSecure = process.env.COOKIE_SECURE !== undefined
  ? String(process.env.COOKIE_SECURE).toLowerCase() === 'true'
  : process.env.NODE_ENV === 'production';

// Session chi dung cho OAuth redirect (khong luu phien dang nhap thuong)
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'joblink_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 5 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure
  } // 5 phut - chi du cho OAuth flow
}));

app.use(passport.initialize());
app.use(passport.session());

function verifyInternalToken(req, configuredToken) {
  if (!configuredToken) return true;
  const headerToken = req.headers['x-metrics-token']
    || req.headers['x-alert-token']
    || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(String(headerToken || ''));
  const b = Buffer.from(String(configuredToken));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'joblink-web',
    env: process.env.NODE_ENV || 'development',
    uptime: Math.round(process.uptime())
  });
});

app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready', service: 'joblink-web', database: 'ok' });
  } catch (_err) {
    res.status(503).json({ status: 'degraded', service: 'joblink-web', database: 'unreachable' });
  }
});

app.get('/metrics', (req, res) => {
  if (!verifyInternalToken(req, process.env.METRICS_TOKEN)) {
    return res.status(401).json({ message: 'Unauthorized metrics scrape.' });
  }
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(renderPrometheusMetrics());
});

app.post('/internal/alert-webhook', async (req, res) => {
  if (!verifyInternalToken(req, process.env.ALERT_WEBHOOK_TOKEN)) {
    return res.status(401).json({ message: 'Unauthorized alert webhook.' });
  }
  const recorded = await recordAlertNotification(req.body || {});
  res.status(202).json({ status: 'accepted', received: recorded.length });
});

app.get('/internal/alert-webhook', (req, res) => {
  if (!verifyInternalToken(req, process.env.ALERT_WEBHOOK_TOKEN)) {
    return res.status(401).json({ message: 'Unauthorized alert ledger.' });
  }
  res.json(getAlertLedger());
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

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`JobLink server đang chạy tại http://localhost:${PORT}`);
    console.log('OAuth providers:');
  });

  const shutdown = (signal) => {
    console.log(`Nhận tín hiệu ${signal}, đang đóng kết nối an toàn...`);
    server.close(async () => {
      try {
        if (typeof pool.end === 'function') await pool.end();
      } catch (_err) { /* ignore pool close error */ }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Vercel tu dong dong goi Express app duoc export thanh mot Function.
module.exports = app;
