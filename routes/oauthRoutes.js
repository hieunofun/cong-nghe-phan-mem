// routes/oauthRoutes.js
// Cac route OAuth: redirect sang provider va xu ly callback

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');

const FRONTEND_URL = (process.env.FRONTEND_URL || process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || '')
  .replace(/\/$/, '');

function frontendRedirect(path) {
  return FRONTEND_URL ? `${FRONTEND_URL}${path}` : path;
}

// Tao JWT sau khi OAuth thanh cong
function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Redirect ve frontend voi token sau khi OAuth thanh cong
function handleOAuthSuccess(req, res) {
  const user = req.user;
  if (!user) return res.redirect(frontendRedirect('/login.html?error=oauth_failed'));

  const token = signToken(user);
  const userData = encodeURIComponent(JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role
  }));

  // Redirect ve trang auth-callback.html, frontend tu luu token va chuyen trang
  res.redirect(frontendRedirect(`/auth-callback.html?token=${token}&user=${userData}`));
}

function handleOAuthFailure(req, res) {
  res.redirect(frontendRedirect('/login.html?error=oauth_failed'));
}

// ── GOOGLE ─────────────────────────────────────────────────────
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.redirect(frontendRedirect('/login.html?error=provider_not_configured'));
  passport.authenticate('google', { scope: ['profile', 'email'], session: true })(req, res, next);
});
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: frontendRedirect('/login.html?error=oauth_failed'), session: true }),
  handleOAuthSuccess
);

// ── GITHUB ─────────────────────────────────────────────────────
router.get('/github', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID) return res.redirect(frontendRedirect('/login.html?error=provider_not_configured'));
  passport.authenticate('github', { scope: ['user:email'], session: true })(req, res, next);
});
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: frontendRedirect('/login.html?error=oauth_failed'), session: true }),
  handleOAuthSuccess
);

// ── FACEBOOK ───────────────────────────────────────────────────
router.get('/facebook', (req, res, next) => {
  if (!process.env.FACEBOOK_APP_ID) return res.redirect(frontendRedirect('/login.html?error=provider_not_configured'));
  passport.authenticate('facebook', { scope: ['email'], session: true })(req, res, next);
});
router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: frontendRedirect('/login.html?error=oauth_failed'), session: true }),
  handleOAuthSuccess
);

// Endpoint tra ve cac provider dang duoc kich hoat (de frontend hien thi nut tuong ung)
router.get('/providers', (req, res) => {
  res.json({
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    facebook: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET)
  });
});

module.exports = router;
