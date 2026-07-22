// controllers/candidateController.js
const candidateModel = require('../models/candidateModel');
const applicationModel = require('../models/applicationModel');
const savedJobModel = require('../models/savedJobModel');
const jobModel = require('../models/jobModel');
const { callAI } = require('../services/aiServiceClient');
const {
  deleteStoredFile,
  storeUploadedFile,
  withAccessibleCVUrl,
  withAccessibleCVUrls
} = require('../services/storageService');
const { extractCVText, extractProfileFields, isLikelyBlankCVTemplate } = require('../utils/cvTextExtractor');

const CV_PROFILE_FIELDS = [
  'full_name', 'phone', 'address', 'birth_date', 'gender',
  'skills', 'experience', 'education'
];

const EMPTY_CV_PROFILE = {
  address: null,
  birth_date: null,
  gender: null,
  skills: null,
  experience: null,
  education: null
};

async function getMyProfile(req, res) {
  try {
    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng viên.' });
    res.json(await withAccessibleCVUrl(profile));
  } catch (err) {
    console.error('getMyProfile error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function updateMyProfile(req, res) {
  try {
    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng viên.' });

    const {
      full_name, phone, address, birth_date, gender, skills, experience, education
    } = req.body;

    const normalizedFullName = full_name === undefined ? undefined : String(full_name).trim();
    if (normalizedFullName !== undefined && !normalizedFullName) {
      return res.status(400).json({ message: 'Họ và tên không được để trống.' });
    }
    if (normalizedFullName && normalizedFullName.length > 150) {
      return res.status(400).json({ message: 'Họ và tên không được vượt quá 150 ký tự.' });
    }

    await candidateModel.updateProfile(profile.id, {
      full_name: normalizedFullName,
      phone: phone === undefined ? undefined : String(phone).trim(),
      address, birth_date, gender, skills, experience, education
    });

    const updated = await candidateModel.findByUserId(req.user.id);
    res.json({ message: 'Cập nhật hồ sơ thành công!', profile: await withAccessibleCVUrl(updated) });
  } catch (err) {
    console.error('updateMyProfile error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function uploadCV(req, res) {
  let storedCVUrl = null;
  let profileUpdateCommitted = false;
  try {
    if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn tệp CV.' });

    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng viên.' });

    storedCVUrl = await storeUploadedFile(req.file, 'cv', profile.id);
    const cvUrl = storedCVUrl;
    const warnings = [];
    let analysis = {};
    let syncedFields = {};
    let cvTextRead = false;

    try {
      const cvText = await extractCVText(cvUrl);
      if (!cvText) {
        warnings.push('Không đọc được nội dung chữ trong CV.');
      } else {
        cvTextRead = true;
        if (isLikelyBlankCVTemplate(cvText)) {
          warnings.push('CV mới có vẻ là mẫu chưa điền; thông tin chuyên môn cũ đã được xóa, họ tên và số điện thoại được giữ lại.');
        } else {
          try {
            analysis = await callAI('/analyze-cv', { cv_text: cvText });
          } catch (err) {
            warnings.push('AI chưa phân tích được kỹ năng; các trường có cấu trúc vẫn được đồng bộ.');
            console.error('uploadCV AI analysis warning:', err.message);
          }
          syncedFields = extractProfileFields(cvText, analysis);
        }
      }
    } catch (err) {
      warnings.push(err.message || 'Không thể trích xuất nội dung CV.');
      console.error('uploadCV extraction warning:', err);
    }

    const profileUpdate = cvTextRead
      ? { ...EMPTY_CV_PROFILE, ...syncedFields, cv_url: cvUrl }
      : { cv_url: cvUrl };
    const clearedFieldNames = cvTextRead
      ? CV_PROFILE_FIELDS.filter((field) => (
          Object.prototype.hasOwnProperty.call(EMPTY_CV_PROFILE, field)
          && syncedFields[field] === undefined
          && profile[field] !== null
          && profile[field] !== ''
        ))
      : [];

    await candidateModel.updateProfile(profile.id, profileUpdate);
    profileUpdateCommitted = true;
    if (profile.cv_url && profile.cv_url !== cvUrl) {
      deleteStoredFile(profile.cv_url).catch((err) => {
        console.error('uploadCV old-file cleanup warning:', err.message);
      });
    }
    const updated = await candidateModel.findByUserId(req.user.id);
    const accessibleProfile = await withAccessibleCVUrl(updated);
    const syncedFieldNames = Object.keys(syncedFields);

    res.json({
      message: cvTextRead
        ? 'Tải CV lên và thay thế dữ liệu hồ sơ thành công!'
        : 'Tải CV lên thành công, nhưng chưa đọc được nội dung để thay thế hồ sơ.',
      cv_url: accessibleProfile.cv_url,
      profile: accessibleProfile,
      synced_fields: syncedFieldNames,
      cleared_fields: clearedFieldNames,
      analysis,
      sync_warning: warnings.length ? warnings.join(' ') : null
    });
  } catch (err) {
    if (storedCVUrl && !profileUpdateCommitted) {
      await deleteStoredFile(storedCVUrl).catch(() => {});
    }
    console.error('uploadCV error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function uploadAvatar(req, res) {
  let avatarUrl = null;
  let profileUpdateCommitted = false;
  try {
    if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn ảnh đại diện.' });

    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng viên.' });

    avatarUrl = await storeUploadedFile(req.file, 'avatar', profile.id);
    await candidateModel.updateProfile(profile.id, { avatar_url: avatarUrl });
    profileUpdateCommitted = true;
    if (profile.avatar_url && profile.avatar_url !== avatarUrl) {
      deleteStoredFile(profile.avatar_url).catch((err) => {
        console.error('uploadAvatar old-file cleanup warning:', err.message);
      });
    }

    res.json({ message: 'Cập nhật ảnh đại diện thành công!', avatar_url: avatarUrl });
  } catch (err) {
    if (avatarUrl && !profileUpdateCommitted) {
      await deleteStoredFile(avatarUrl).catch(() => {});
    }
    console.error('uploadAvatar error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function getMyApplications(req, res) {
  try {
    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng viên.' });

    const applications = await applicationModel.findByCandidate(profile.id);
    res.json(await withAccessibleCVUrls(applications));
  } catch (err) {
    console.error('getMyApplications error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function getSavedJobs(req, res) {
  try {
    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng viên.' });

    const jobs = await savedJobModel.findByCandidate(profile.id);
    res.json(jobs);
  } catch (err) {
    console.error('getSavedJobs error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function saveJob(req, res) {
  try {
    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng viên.' });

    const job = await jobModel.findById(req.params.jobId);
    if (!job || job.status !== 'active') {
      return res.status(404).json({ message: 'Tin tuyển dụng không tồn tại hoặc đã đóng.' });
    }

    const alreadyApplied = await applicationModel.hasApplied(req.params.jobId, profile.id);
    if (alreadyApplied) {
      return res.status(409).json({
        message: 'Bạn đã ứng tuyển tin này. Hãy theo dõi tại mục Đơn đã ứng tuyển.'
      });
    }

    await savedJobModel.saveJob(profile.id, req.params.jobId);
    res.json({ message: 'Đã lưu tin tuyển dụng!' });
  } catch (err) {
    console.error('saveJob error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

async function unsaveJob(req, res) {
  try {
    const profile = await candidateModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng viên.' });

    await savedJobModel.unsaveJob(profile.id, req.params.jobId);
    res.json({ message: 'Đã bỏ lưu tin tuyển dụng.' });
  } catch (err) {
    console.error('unsaveJob error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
}

module.exports = {
  getMyProfile, updateMyProfile, uploadCV, uploadAvatar,
  getMyApplications, getSavedJobs, saveJob, unsaveJob
};
