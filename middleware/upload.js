// middleware/upload.js
// Cau hinh multer de upload file: CV (pdf/docx), logo cong ty, avatar ung vien

const path = require('path');
const multer = require('multer');
const memoryStorage = multer.memoryStorage();

function fileFilterFor(allowedExts) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Chỉ cho phép tệp có đuôi: ${allowedExts.join(', ')}`));
    }
  };
}

const uploadCV = multer({
  storage: memoryStorage,
  fileFilter: fileFilterFor(['.pdf', '.docx']),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadLogo = multer({
  storage: memoryStorage,
  fileFilter: fileFilterFor(['.png', '.jpg', '.jpeg', '.webp']),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

const uploadAvatar = multer({
  storage: memoryStorage,
  fileFilter: fileFilterFor(['.png', '.jpg', '.jpeg', '.webp']),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

// Middleware bat loi tu multer (vi du file qua lon, sai duoi) tra ve JSON de frontend hien thi
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ message: err.message || 'Lỗi khi tải tệp lên.' });
  }
  next();
}

module.exports = { uploadCV, uploadLogo, uploadAvatar, handleUploadError };
