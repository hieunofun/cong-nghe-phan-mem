// database/seed.js
// Script tao tai khoan Admin + du lieu mau (chay 1 lan: npm run seed)

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const userModel = require('../models/userModel');
const companyModel = require('../models/companyModel');
const candidateModel = require('../models/candidateModel');
const jobModel = require('../models/jobModel');

async function upsertUser(email, password, role, status = 'active') {
  const existing = await userModel.findByEmail(email);
  if (existing) return existing.id;
  const hashed = await bcrypt.hash(password, 10);
  return userModel.createUser({ email, hashedPassword: hashed, role, status });
}

async function seed() {
  try {
    console.log('Dang tao du lieu mau...');

    // 1. Tai khoan Admin
    const adminId = await upsertUser('admin@joblink.vn', 'Admin@123', 'admin');
    console.log('Admin:', 'admin@joblink.vn / Admin@123 (id=' + adminId + ')');

    // 2. Doanh nghiep mau (da duoc duyet san)
    const companiesData = [
      {
        email: 'hr@vietsoft.vn', password: 'Company@123',
        company_name: 'VietSoft Solutions', tax_code: '0312345678',
        address: 'Toa nha Innovation, Quan Cau Giay, Ha Noi',
        description: 'Cong ty phat trien phan mem chuyen cung cap giai phap web va mobile cho doanh nghiep vua va nho.',
        scale: '50-100 nhan vien'
      },
      {
        email: 'tuyendung@greenmart.vn', password: 'Company@123',
        company_name: 'GreenMart Retail', tax_code: '0398765432',
        address: 'Toa nha Sunrise, Quan 7, TP. Ho Chi Minh',
        description: 'He thong sieu thi ban le thuc pham sach voi hon 30 chi nhanh tren toan quoc.',
        scale: '200-500 nhan vien'
      }
    ];

    const categories = (await pool.query('SELECT * FROM categories'))[0];
    const findCat = (name) => categories.find((c) => c.name === name);

    const companyIds = [];
    for (const c of companiesData) {
      const userId = await upsertUser(c.email, c.password, 'company');
      let company = await companyModel.findByUserId(userId);
      if (!company) {
        const companyId = await companyModel.createCompany({
          userId, companyName: c.company_name, taxCode: c.tax_code, address: c.address
        });
        await companyModel.updateProfile(companyId, {
          description: c.description, scale: c.scale
        });
        await companyModel.updateStatus(companyId, 'approved');
        company = await companyModel.findById(companyId);
      }
      companyIds.push(company.id);
      console.log('Doanh nghiep:', c.email, '/ Company@123 (id=' + company.id + ')');
    }

    // 3. Tin tuyen dung mau
    const jobsData = [
      {
        companyIndex: 0, category: 'Cong nghe thong tin',
        title: 'Lap trinh vien Backend Node.js',
        description: 'Phat trien va bao tri he thong API cho cac san pham web cua cong ty. Lam viec truc tiep voi team Product de hien thuc hoa tinh nang moi.',
        requirements: 'Thanh thao JavaScript/Node.js, hieu biet ve MySQL hoac MongoDB, biet su dung Git.',
        benefits: 'Luong thang 13, bao hiem suc khoe, lam viec hybrid 2 ngay/tuan tu xa.',
        salary_min: 12000000, salary_max: 20000000,
        location: 'Cau Giay, Ha Noi', job_type: 'full-time', experience_level: '1-2 nam',
        vacancies: 3
      },
      {
        companyIndex: 0, category: 'Cong nghe thong tin',
        title: 'Thuc tap sinh Frontend (React)',
        description: 'Ho tro team frontend xay dung giao dien cho cac du an noi bo. Phu hop sinh vien nam 3, nam 4 muon tich luy kinh nghiem thuc te.',
        requirements: 'Biet HTML/CSS/JavaScript co ban, da tung lam quen voi React la loi the.',
        benefits: 'Tro cap thuc tap, co hoi len full-time sau 3 thang.',
        salary_min: 3000000, salary_max: 5000000, salary_negotiable: true,
        location: 'Cau Giay, Ha Noi', job_type: 'internship', experience_level: 'Sinh vien nam 3-4',
        vacancies: 2
      },
      {
        companyIndex: 1, category: 'Kinh doanh / Ban hang',
        title: 'Nhan vien Kinh doanh khu vuc TP.HCM',
        description: 'Trien khai ke hoach ban hang, cham soc he thong khach hang dai ly hien co va phat trien khach hang moi tai khu vuc duoc giao.',
        requirements: 'Co kinh nghiem ban hang tu 6 thang, giao tiep tot, co xe may di lai.',
        benefits: 'Luong cung 8 trieu + hoa hong, phu cap xang xe va dien thoai.',
        salary_min: 8000000, salary_max: 15000000,
        location: 'Quan 7, TP. Ho Chi Minh', job_type: 'full-time', experience_level: '6 thang - 1 nam',
        vacancies: 5
      },
      {
        companyIndex: 1, category: 'Cham soc khach hang',
        title: 'Nhan vien Cham soc khach hang (Part-time)',
        description: 'Tiep nhan va xu ly phan hoi cua khach hang qua hotline va fanpage trong ca lam viec linh hoat.',
        requirements: 'Giong noi de nghe, kien nhan, co the lam ca toi hoac cuoi tuan.',
        benefits: 'Luong theo gio, thuong hieu suat thang.',
        salary_min: 25000, salary_max: 35000, salary_negotiable: false,
        location: 'Quan 7, TP. Ho Chi Minh', job_type: 'part-time', experience_level: 'Khong yeu cau',
        vacancies: 4
      }
    ];

    for (const j of jobsData) {
      const companyId = companyIds[j.companyIndex];
      const cat = findCat(j.category);
      const existingJobs = await jobModel.findByCompany(companyId);
      if (existingJobs.some((ej) => ej.title === j.title)) continue;

      await jobModel.createJob(companyId, {
        title: j.title,
        description: j.description,
        requirements: j.requirements,
        benefits: j.benefits,
        salary_min: j.salary_min,
        salary_max: j.salary_max,
        salary_negotiable: j.salary_negotiable || false,
        location: j.location,
        job_type: j.job_type,
        experience_level: j.experience_level,
        vacancies: j.vacancies,
        deadline: null,
        category_id: cat ? cat.id : null
      });
    }
    console.log('Da tao', jobsData.length, 'tin tuyen dung mau.');

    // 4. Ung vien mau
    const candidateUserId = await upsertUser('candidate@joblink.vn', 'Candidate@123', 'candidate');
    let candidate = await candidateModel.findByUserId(candidateUserId);
    if (!candidate) {
      const candidateId = await candidateModel.createCandidate({
        userId: candidateUserId, fullName: 'Nguyen Van A'
      });
      await candidateModel.updateProfile(candidateId, {
        phone: '0901234567',
        address: 'Quan Dong Da, Ha Noi',
        skills: 'JavaScript, HTML/CSS, Giao tiep, Lam viec nhom',
        experience: 'Da tham gia 2 do an mon hoc ve phat trien web tai truong.',
        education: 'Sinh vien nam 3, chuyen nganh Cong nghe thong tin'
      });
    }
    console.log('Ung vien mau:', 'candidate@joblink.vn / Candidate@123');

    console.log('\nHoan tat seed du lieu! Ban co the dang nhap ngay bang cac tai khoan tren.');
    process.exit(0);
  } catch (err) {
    console.error('Loi khi seed du lieu:', err);
    process.exit(1);
  }
}

seed();
