// models/applicationModel.js
const pool = require('../config/db');

async function create({
  jobId,
  candidateId,
  cvUrl,
  cvFilename,
  cvSource = 'profile',
  applicationSource = 'manual',
  coverLetter,
  changedByUserId,
  initialNote,
  aiScore = null,
  aiLabel = null
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const insertResult = await connection.query(
      `INSERT INTO applications
        (job_id, candidate_id, cv_url, cv_filename, cv_source, application_source,
         cover_letter, status, ai_score, ai_label, ai_analyzed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?,
         CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END)`,
      [
        jobId, candidateId, cvUrl || null, cvFilename || null, cvSource,
        applicationSource, coverLetter || null, aiScore, aiLabel || null,
        aiScore !== null && aiScore !== undefined
      ]
    );
    const applicationId = insertResult?.rows?.[0]?.id || insertResult?.[0]?.insertId;
    if (!applicationId) throw new Error('Không lấy được mã hồ sơ ứng tuyển vừa tạo.');

    await connection.query(
      `INSERT INTO application_status_history
        (application_id, from_status, to_status, note, changed_by_user_id)
       VALUES (?, ?, 'pending', ?, ?)`,
      [
        applicationId,
        null,
        initialNote || 'Ứng viên gửi hồ sơ ứng tuyển',
        changedByUserId || null
      ]
    );
    await connection.commit();
    return applicationId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function hasApplied(jobId, candidateId) {
  const [rows] = await pool.query(
    'SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?',
    [jobId, candidateId]
  );
  return rows.length > 0;
}

async function isCVReferenced(cvUrl) {
  if (!cvUrl) return false;
  const [rows] = await pool.query(
    'SELECT id FROM applications WHERE cv_url = ? LIMIT 1',
    [cvUrl]
  );
  return rows.length > 0;
}

async function findCandidateIdsByJob(jobId) {
  const [rows] = await pool.query(
    'SELECT candidate_id FROM applications WHERE job_id = ?',
    [jobId]
  );
  return rows.map((row) => Number(row.candidate_id));
}

const APPLICANT_SORTS = {
  newest: 'a.applied_at DESC, a.id DESC',
  oldest: 'a.applied_at ASC, a.id ASC',
  ai_desc: 'CASE WHEN a.ai_score IS NULL THEN 1 ELSE 0 END ASC, a.ai_score DESC, a.applied_at DESC'
};

function buildApplicantFilters({ jobId, search, skill, status }, includeStatus = true) {
  const conditions = ['a.job_id = ?'];
  const params = [jobId];

  if (search) {
    const keyword = `%${search.toLowerCase()}%`;
    conditions.push(`(
      LOWER(COALESCE(cd.full_name, '')) LIKE ?
      OR LOWER(COALESCE(u.email, '')) LIKE ?
      OR LOWER(COALESCE(cd.phone, '')) LIKE ?
    )`);
    params.push(keyword, keyword, keyword);
  }

  if (skill) {
    conditions.push("LOWER(COALESCE(cd.skills, '')) LIKE ?");
    params.push(`%${skill.toLowerCase()}%`);
  }

  if (includeStatus && status) {
    conditions.push('a.status = ?');
    params.push(status);
  }

  return { where: conditions.join(' AND '), params };
}

// Tai tung trang ung vien cua mot tin; bo loc va phan trang duoc xu ly tai database.
async function searchByJob(jobId, { search = '', skill = '', status = '', page = 1, limit = 20, sort = 'newest' } = {}) {
  const filters = { jobId, search, skill, status };
  const pageFilters = buildApplicantFilters(filters, true);
  const countFilters = buildApplicantFilters(filters, false);
  const orderBy = APPLICANT_SORTS[sort] || APPLICANT_SORTS.newest;
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT a.*, cd.full_name,
            COALESCE(NULLIF(TRIM(cd.full_name), ''), u.email) AS display_name,
            cd.phone, cd.skills, cd.experience, cd.avatar_url, u.email
     FROM applications a
     JOIN candidates cd ON cd.id = a.candidate_id
     JOIN users u ON u.id = cd.user_id
     WHERE ${pageFilters.where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...pageFilters.params, limit, offset]
  );

  const [[totalRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM applications a
     JOIN candidates cd ON cd.id = a.candidate_id
     JOIN users u ON u.id = cd.user_id
     WHERE ${pageFilters.where}`,
    pageFilters.params
  );

  const [countRows] = await pool.query(
    `SELECT a.status, COUNT(*) AS count
     FROM applications a
     JOIN candidates cd ON cd.id = a.candidate_id
     JOIN users u ON u.id = cd.user_id
     WHERE ${countFilters.where}
     GROUP BY a.status`,
    countFilters.params
  );

  const counts = countRows.reduce((result, row) => {
    result[row.status] = Number(row.count);
    return result;
  }, {});

  return { applications: rows, total: Number(totalRow?.total || 0), counts };
}

// Danh sach tin ung vien da ung tuyen (cho candidate dashboard)
async function findByCandidate(candidateId) {
  const [rows] = await pool.query(
    `SELECT a.*, j.title AS job_title, j.location, j.job_type,
            j.salary_min, j.salary_max, j.salary_negotiable, j.status AS job_status,
            j.category_id, cat.name AS category_name, c.company_name, c.logo_url
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN companies c ON c.id = j.company_id
     LEFT JOIN categories cat ON cat.id = j.category_id
     WHERE a.candidate_id = ?
     ORDER BY a.applied_at DESC`,
    [candidateId]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT a.*, j.company_id, j.title AS job_title,
            j.description AS job_description, j.requirements AS job_requirements
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function updateAIScore(id, { score, label }) {
  await pool.query(
    'UPDATE applications SET ai_score = ?, ai_label = ?, ai_analyzed_at = CURRENT_TIMESTAMP WHERE id = ?',
    [score, label || null, id]
  );
}

async function updateStatus(id, status, { previousStatus, note, changedByUserId } = {}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      'UPDATE applications SET status = ?, status_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, note || null, id]
    );
    await connection.query(
      `INSERT INTO application_status_history
        (application_id, from_status, to_status, note, changed_by_user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [id, previousStatus, status, note || null, changedByUserId || null]
    );
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function findStatusHistory(applicationId) {
  const [rows] = await pool.query(
    `SELECT h.*, u.email AS changed_by_email
     FROM application_status_history h
     LEFT JOIN users u ON u.id = h.changed_by_user_id
     WHERE h.application_id = ?
     ORDER BY h.changed_at ASC, h.id ASC`,
    [applicationId]
  );
  return rows;
}

// Thong ke nhanh cho company dashboard: so luong theo trang thai
async function countByCompanyAndStatus(companyId) {
  const [rows] = await pool.query(
    `SELECT a.status, COUNT(*) AS count
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE j.company_id = ?
     GROUP BY a.status`,
    [companyId]
  );
  return rows;
}

module.exports = {
  create, hasApplied, isCVReferenced, findCandidateIdsByJob,
  searchByJob, findByCandidate, findById,
  updateAIScore, updateStatus, findStatusHistory, countByCompanyAndStatus
};
