// controllers/companyController.js
const companyModel = require('../models/companyModel');

async function getMyProfile(req, res) {
  try {
    const profile = await companyModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });
    res.json(profile);
  } catch (err) {
    console.error('getMyProfile error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function updateMyProfile(req, res) {
  try {
    const profile = await companyModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });

    const { company_name, description, website, address, scale, tax_code } = req.body;
    await companyModel.updateProfile(profile.id, {
      company_name, description, website, address, scale, tax_code
    });

    const updated = await companyModel.findByUserId(req.user.id);
    res.json({ message: 'Cap nhat ho so cong ty thanh cong!', profile: updated });
  } catch (err) {
    console.error('updateMyProfile error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function uploadLogo(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Vui long chon file logo.' });

    const profile = await companyModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Khong tim thay ho so doanh nghiep.' });

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    await companyModel.updateProfile(profile.id, { logo_url: logoUrl });

    res.json({ message: 'Cap nhat logo thanh cong!', logo_url: logoUrl });
  } catch (err) {
    console.error('uploadLogo error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

// Lay thong tin cong khai 1 cong ty (cho trang chi tiet tin tuyen dung)
async function getPublicProfile(req, res) {
  try {
    const profile = await companyModel.findById(req.params.id);
    if (!profile || profile.status !== 'approved') {
      return res.status(404).json({ message: 'Khong tim thay doanh nghiep.' });
    }
    res.json(profile);
  } catch (err) {
    console.error('getPublicProfile error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

module.exports = { getMyProfile, updateMyProfile, uploadLogo, getPublicProfile };
