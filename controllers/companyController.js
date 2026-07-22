// controllers/companyController.js
const companyModel = require('../models/companyModel');
const { deleteStoredFile, storeUploadedFile } = require('../services/storageService');

async function getMyProfile(req, res) {
  try {
    const profile = await companyModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });
    res.json(profile);
  } catch (err) {
    console.error('getMyProfile error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function updateMyProfile(req, res) {
  try {
    const profile = await companyModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });

    const { company_name, description, website, address, scale, tax_code } = req.body;
    await companyModel.updateProfile(profile.id, {
      company_name, description, website, address, scale, tax_code
    });

    const updated = await companyModel.findByUserId(req.user.id);
    res.json({ message: 'Cập nhật hồ sơ công ty thành công!', profile: updated });
  } catch (err) {
    console.error('updateMyProfile error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function uploadLogo(req, res) {
  let logoUrl = null;
  let profileUpdateCommitted = false;
  try {
    if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn tệp logo.' });

    const profile = await companyModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ doanh nghiệp.' });

    logoUrl = await storeUploadedFile(req.file, 'logo', profile.id);
    await companyModel.updateProfile(profile.id, { logo_url: logoUrl });
    profileUpdateCommitted = true;
    if (profile.logo_url && profile.logo_url !== logoUrl) {
      deleteStoredFile(profile.logo_url).catch((err) => {
        console.error('uploadLogo old-file cleanup warning:', err.message);
      });
    }

    res.json({ message: 'Cập nhật logo thành công!', logo_url: logoUrl });
  } catch (err) {
    if (logoUrl && !profileUpdateCommitted) {
      await deleteStoredFile(logoUrl).catch(() => {});
    }
    console.error('uploadLogo error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

// Lay thong tin cong khai 1 cong ty (cho trang chi tiet tin tuyen dung)
async function getPublicProfile(req, res) {
  try {
    const profile = await companyModel.findById(req.params.id);
    if (!profile || profile.status !== 'approved') {
      return res.status(404).json({ message: 'Không tìm thấy doanh nghiệp.' });
    }
    res.json(profile);
  } catch (err) {
    console.error('getPublicProfile error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

module.exports = { getMyProfile, updateMyProfile, uploadLogo, getPublicProfile };
