// controllers/candidateController.js
const candidateModel = require('../models/candidateModel');
const applicationModel = require('../models/applicationModel');
const savedJobModel = require('../models/savedJobModel');

async function getMyProfile(req, res) {
  try {
    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Khong tim thay ho so ung vien.' });
    res.json(profile);
  } catch (err) {
    console.error('getMyProfile error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function updateMyProfile(req, res) {
  try {
    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Khong tim thay ho so ung vien.' });

    const {
      full_name, phone, address, birth_date, gender, skills, experience, education
    } = req.body;

    await candidateModel.updateProfile(profile.id, {
      full_name, phone, address, birth_date, gender, skills, experience, education
    });

    const updated = await candidateModel.findByUserId(req.user.id);
    res.json({ message: 'Cap nhat ho so thanh cong!', profile: updated });
  } catch (err) {
    console.error('updateMyProfile error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function uploadCV(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Vui long chon file CV.' });

    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Khong tim thay ho so ung vien.' });

    const cvUrl = `/uploads/cv/${req.file.filename}`;
    await candidateModel.updateProfile(profile.id, { cv_url: cvUrl });

    res.json({ message: 'Upload CV thanh cong!', cv_url: cvUrl });
  } catch (err) {
    console.error('uploadCV error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function uploadAvatar(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Vui long chon anh dai dien.' });

    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Khong tim thay ho so ung vien.' });

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await candidateModel.updateProfile(profile.id, { avatar_url: avatarUrl });

    res.json({ message: 'Cap nhat anh dai dien thanh cong!', avatar_url: avatarUrl });
  } catch (err) {
    console.error('uploadAvatar error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function getMyApplications(req, res) {
  try {
    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Khong tim thay ho so ung vien.' });

    const applications = await applicationModel.findByCandidate(profile.id);
    res.json(applications);
  } catch (err) {
    console.error('getMyApplications error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function getSavedJobs(req, res) {
  try {
    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Khong tim thay ho so ung vien.' });

    const jobs = await savedJobModel.findByCandidate(profile.id);
    res.json(jobs);
  } catch (err) {
    console.error('getSavedJobs error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function saveJob(req, res) {
  try {
    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Khong tim thay ho so ung vien.' });

    await savedJobModel.saveJob(profile.id, req.params.jobId);
    res.json({ message: 'Da luu tin tuyen dung!' });
  } catch (err) {
    console.error('saveJob error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

async function unsaveJob(req, res) {
  try {
    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Khong tim thay ho so ung vien.' });

    await savedJobModel.unsaveJob(profile.id, req.params.jobId);
    res.json({ message: 'Da bo luu tin tuyen dung.' });
  } catch (err) {
    console.error('unsaveJob error:', err);
    res.status(500).json({ message: 'Loi server, vui long thu lai sau.' });
  }
}

module.exports = {
  getMyProfile, updateMyProfile, uploadCV, uploadAvatar,
  getMyApplications, getSavedJobs, saveJob, unsaveJob
};
