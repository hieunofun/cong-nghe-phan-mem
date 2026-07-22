// config/passport.js
// Cau hinh Passport.js voi 3 strategy: Google, GitHub, Facebook

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const pool = require('./db');
const candidateModel = require('../models/candidateModel');
const { getAppBaseUrl } = require('../utils/appUrl');

const appBaseUrl = getAppBaseUrl();

// Serialize / deserialize chi dung trong pham vi OAuth redirect (khong dung session lau dai)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ── HELPER: Tim hoac tao user tu thong tin OAuth ──────────────
async function findOrCreateOAuthUser({ provider, oauthId, email, displayName, socialAvatar }) {
  // 1. Tim theo oauth_provider + oauth_id (da dang nhap OAuth truoc)
  const [byOAuth] = await pool.query(
    'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?',
    [provider, oauthId]
  );
  if (byOAuth.length > 0) return byOAuth[0];

  // 2. Tim theo email (co tai khoan email/password hoac OAuth khac)
  if (email) {
    const [byEmail] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (byEmail.length > 0) {
      // Lien ket tai khoan OAuth vao tai khoan hien co
      await pool.query(
        'UPDATE users SET oauth_provider = ?, oauth_id = ?, display_name = ?, social_avatar = ? WHERE id = ?',
        [provider, oauthId, displayName, socialAvatar, byEmail[0].id]
      );
      return byEmail[0];
    }
  }

  // 3. Tao tai khoan moi (ung vien mac dinh)
  const [result] = await pool.query(
    `INSERT INTO users (email, password, role, status, oauth_provider, oauth_id, display_name, social_avatar)
     VALUES (?, NULL, 'candidate', 'active', ?, ?, ?, ?)`,
    [email || null, provider, oauthId, displayName || null, socialAvatar || null]
  );
  const newUserId = result.insertId;

  // Tu dong tao ho so ung vien
  await candidateModel.createCandidate({
    userId: newUserId,
    fullName: displayName || 'Nguoi dung moi'
  });

  // Neu co avatar tu mang xa hoi, cap nhat vao ho so ung vien
  if (socialAvatar) {
    const candidate = await candidateModel.findByUserId(newUserId);
    if (candidate) {
      await candidateModel.updateProfile(candidate.id, { avatar_url: socialAvatar });
    }
  }

  return { id: newUserId, email, role: 'candidate', status: 'active' };
}

// ── GOOGLE ─────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${appBaseUrl}/api/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateOAuthUser({
        provider: 'google',
        oauthId: profile.id,
        email: profile.emails?.[0]?.value || null,
        displayName: profile.displayName,
        socialAvatar: profile.photos?.[0]?.value || null
      });
      done(null, user);
    } catch (err) {
      console.error('Google OAuth error:', err);
      done(err, null);
    }
  }));
  console.log('  OAuth: Google da kich hoat');
} else {
  console.log('  OAuth: Google chua cau hinh (them GOOGLE_CLIENT_ID/SECRET vao .env)');
}

// ── GITHUB ─────────────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${appBaseUrl}/api/auth/github/callback`,
    scope: ['user:email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.find(e => e.primary)?.value
                 || profile.emails?.[0]?.value
                 || null;
      const user = await findOrCreateOAuthUser({
        provider: 'github',
        oauthId: String(profile.id),
        email,
        displayName: profile.displayName || profile.username,
        socialAvatar: profile.photos?.[0]?.value || null
      });
      done(null, user);
    } catch (err) {
      console.error('GitHub OAuth error:', err);
      done(err, null);
    }
  }));
  console.log('  OAuth: GitHub da kich hoat');
} else {
  console.log('  OAuth: GitHub chua cau hinh (them GITHUB_CLIENT_ID/SECRET vao .env)');
}

// ── FACEBOOK ───────────────────────────────────────────────────
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${appBaseUrl}/api/auth/facebook/callback`,
    profileFields: ['id', 'emails', 'name', 'displayName', 'photos']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const displayName = profile.displayName
        || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim()
        || 'Facebook User';
      const user = await findOrCreateOAuthUser({
        provider: 'facebook',
        oauthId: profile.id,
        email: profile.emails?.[0]?.value || null,
        displayName,
        socialAvatar: profile.photos?.[0]?.value || null
      });
      done(null, user);
    } catch (err) {
      console.error('Facebook OAuth error:', err);
      done(err, null);
    }
  }));
  console.log('  OAuth: Facebook da kich hoat');
} else {
  console.log('  OAuth: Facebook chua cau hinh (them FACEBOOK_APP_ID/SECRET vao .env)');
}

module.exports = passport;
