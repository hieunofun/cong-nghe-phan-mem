// middleware/auth.js
// Middleware xac thuc JWT va phan quyen theo vai tro (admin / company / candidate)

const jwt = require('jsonwebtoken');

// Kiem tra nguoi dung da dang nhap chua (giai ma token JWT)
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Ban chua dang nhap hoac thieu token.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded chua: { id, role, email }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token khong hop le hoac da het han.' });
  }
}

// Tao middleware gioi han theo vai tro, vi du: requireRole('admin', 'company')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Ban chua dang nhap.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Ban khong co quyen truy cap chuc nang nay.' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
