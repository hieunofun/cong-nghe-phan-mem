// models/jobModel.js
const pool = require('../config/db');

// Tao tin tuyen dung moi
async function createJob(companyId, data) {
  const {
    title, description, requirements, benefits,
    salary_min, salary_max, salary_negotiable,
    location, job_type, experience_level,
    vacancies, deadline, category_id, is_vip, is_featured
  } = data;

  const [result] = await pool.query(
    `INSERT INTO jobs
      (company_id, category_id, title, description, requirements, benefits,
       salary_min, salary_max, salary_negotiable, location, job_type,
       experience_level, vacancies, deadline, is_vip, is_featured, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      companyId, category_id || null, title, description, requirements || null, benefits || null,
      salary_min || null, salary_max || null, !!salary_negotiable, location || null, job_type || 'full-time',
      experience_level || null, vacancies || 1, deadline || null,
      !!is_vip, !!is_featured
    ]
  );
  return result.insertId;
}

async function updateJob(jobId, data) {
  const allowed = [
    'title', 'description', 'requirements', 'benefits', 'salary_min', 'salary_max',
    'salary_negotiable', 'location', 'job_type', 'experience_level', 'vacancies',
    'deadline', 'category_id', 'status'
  ];
  const sets = [];
  const values = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(data[key]);
    }
  }
  if (sets.length === 0) return;
  values.push(jobId);
  await pool.query(`UPDATE jobs SET ${sets.join(', ')} WHERE id = ?`, values);
}

async function deleteJob(jobId) {
  await pool.query('DELETE FROM jobs WHERE id = ?', [jobId]);
}

// Lay chi tiet 1 tin, kem thong tin cong ty + ten nganh nghe
async function findById(jobId) {
  const [rows] = await pool.query(
    `SELECT j.*, c.company_name, c.logo_url, c.address AS company_address,
            c.description AS company_description, cat.name AS category_name
     FROM jobs j
     JOIN companies c ON c.id = j.company_id
     LEFT JOIN categories cat ON cat.id = j.category_id
     WHERE j.id = ?`,
    [jobId]
  );
  return rows[0] || null;
}

async function incrementViews(jobId) {
  await pool.query('UPDATE jobs SET views = views + 1 WHERE id = ?', [jobId]);
}

// Tim kiem / loc tin tuyen dung cho trang public
async function search(filters = {}) {
  const {
    keyword, category_id, location, job_type,
    salary_min, page = 1, limit = 10
  } = filters;

  const where = [`j.status = 'active'`, `c.status = 'approved'`];
  const params = [];

  if (keyword) {
    where.push('(j.title LIKE ? OR j.description LIKE ? OR c.company_name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (category_id) {
    where.push('j.category_id = ?');
    params.push(category_id);
  }
  if (location) {
    where.push('j.location LIKE ?');
    params.push(`%${location}%`);
  }
  if (job_type) {
    where.push('j.job_type = ?');
    params.push(job_type);
  }
  if (salary_min) {
    where.push('(j.salary_max >= ? OR j.salary_negotiable = TRUE)');
    params.push(salary_min);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const [rows] = await pool.query(
    `SELECT j.*, c.company_name, c.logo_url, cat.name AS category_name
     FROM jobs j
     JOIN companies c ON c.id = j.company_id
     LEFT JOIN categories cat ON cat.id = j.category_id
     ${whereClause}
     ORDER BY j.is_vip DESC, j.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM jobs j
     JOIN companies c ON c.id = j.company_id
     ${whereClause}`,
    params
  );

  return { jobs: rows, total: countRows[0].total };
}

async function getFeatured(limit = 6) {
  const [rows] = await pool.query(
    `SELECT j.*, c.company_name, c.logo_url, cat.name AS category_name
     FROM jobs j
     JOIN companies c ON c.id = j.company_id
     LEFT JOIN categories cat ON cat.id = j.category_id
     WHERE j.status = 'active' AND c.status = 'approved'
     ORDER BY j.created_at DESC
     LIMIT ?`,
    [Number(limit)]
  );
  return rows;
}

// Lay danh sach tin theo tung doanh nghiep (cho company dashboard)
async function findByCompany(companyId) {
  const [rows] = await pool.query(
    `SELECT j.*, cat.name AS category_name,
       (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS application_count
     FROM jobs j
     LEFT JOIN categories cat ON cat.id = j.category_id
     WHERE j.company_id = ?
     ORDER BY j.created_at DESC`,
    [companyId]
  );
  return rows;
}

async function getAllForAdmin() {
  const [rows] = await pool.query(
    `SELECT j.*, c.company_name, c.status AS company_status
     FROM jobs j
     JOIN companies c ON c.id = j.company_id
     ORDER BY j.created_at DESC`
  );
  return rows;
}

async function countActiveByCompany(companyId) {
  const [[{ cnt }]] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM jobs WHERE company_id = ? AND status = 'active'",
    [companyId]
  );
  return cnt;
}

module.exports = {
  createJob, updateJob, deleteJob, findById, incrementViews,
  search, getFeatured, findByCompany, getAllForAdmin, countActiveByCompany
};
