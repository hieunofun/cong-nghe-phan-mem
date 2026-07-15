// middleware/upload.js
// Cau hinh multer de upload file: CV (pdf/doc/docx), logo cong ty, avatar ung vien

const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Dam bao cac thu muc luu file da ton tai
['uploads/cv', 'uploads/logos', 'uploads/avatars'].forEach((dir) => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

function makeStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '..', 'uploads', subfolder));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const safeName = `${subfolder}_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, safeName);
    }
  });
}

function fileFilterFor(allowedExts) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Chi cho phep file co duoi: ${allowedExts.join(', ')}`));
    }
  };
}

const uploadCV = multer({
  storage: makeStorage('cv'),
  fileFilter: fileFilterFor(['.pdf', '.doc', '.docx']),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadLogo = multer({
  storage: makeStorage('logos'),
  fileFilter: fileFilterFor(['.png', '.jpg', '.jpeg', '.svg', '.webp']),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

const uploadAvatar = multer({
  storage: makeStorage('avatars'),
  fileFilter: fileFilterFor(['.png', '.jpg', '.jpeg', '.webp']),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

// Middleware bat loi tu multer (vi du file qua lon, sai duoi) tra ve JSON de frontend hien thi
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ message: err.message || 'Loi khi upload file.' });
  }
  next();
}

module.exports = { uploadCV, uploadLogo, uploadAvatar, handleUploadError };
