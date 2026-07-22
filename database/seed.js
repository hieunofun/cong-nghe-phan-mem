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
    console.log('Đang tạo dữ liệu mẫu...');

    // 1. Tai khoan Admin
    const adminId = await upsertUser('admin@joblink.vn', 'Admin@123', 'admin');
    console.log('Admin:', 'admin@joblink.vn / Admin@123 (id=' + adminId + ')');

    // 2. Doanh nghiep mau (da duoc duyet san)
    const companiesData = [
      {
        email: 'hr@vietsoft.vn', password: 'Company@123',
        company_name: 'VietSoft Solutions', tax_code: '0312345678',
        address: 'Tòa nhà Innovation, Quận Cầu Giấy, Hà Nội',
        description: 'Công ty phát triển phần mềm chuyên cung cấp giải pháp web và mobile cho doanh nghiệp vừa và nhỏ.',
        scale: '50-100 nhân viên'
      },
      {
        email: 'tuyendung@greenmart.vn', password: 'Company@123',
        company_name: 'GreenMart Retail', tax_code: '0398765432',
        address: 'Tòa nhà Sunrise, Quận 7, TP. Hồ Chí Minh',
        description: 'Hệ thống siêu thị bán lẻ thực phẩm sạch với hơn 30 chi nhánh trên toàn quốc.',
        scale: '200-500 nhân viên'
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
        companyIndex: 0, category: 'Công nghệ thông tin',
        title: 'Lập trình viên Backend Node.js',
        description: 'Phát triển và bảo trì hệ thống API cho các sản phẩm web của công ty. Làm việc trực tiếp với nhóm Product để hiện thực hóa tính năng mới.',
        requirements: 'Thành thạo JavaScript/Node.js, hiểu biết về MySQL hoặc MongoDB, biết sử dụng Git.',
        benefits: 'Lương tháng 13, bảo hiểm sức khỏe, làm việc hybrid 2 ngày/tuần từ xa.',
        salary_min: 12000000, salary_max: 20000000,
        location: 'Cầu Giấy, Hà Nội', job_type: 'full-time', experience_level: '1-2 năm',
        vacancies: 3
      },
      {
        companyIndex: 0, category: 'Công nghệ thông tin',
        title: 'Thực tập sinh Frontend (React)',
        description: 'Hỗ trợ nhóm frontend xây dựng giao diện cho các dự án nội bộ. Phù hợp sinh viên năm 3, năm 4 muốn tích lũy kinh nghiệm thực tế.',
        requirements: 'Biết HTML/CSS/JavaScript cơ bản, đã từng làm quen với React là lợi thế.',
        benefits: 'Trợ cấp thực tập, cơ hội lên nhân viên chính thức sau 3 tháng.',
        salary_min: 3000000, salary_max: 5000000, salary_negotiable: true,
        location: 'Cầu Giấy, Hà Nội', job_type: 'internship', experience_level: 'Sinh viên năm 3-4',
        vacancies: 2
      },
      {
        companyIndex: 1, category: 'Kinh doanh / Bán hàng',
        title: 'Nhân viên Kinh doanh khu vực TP.HCM',
        description: 'Triển khai kế hoạch bán hàng, chăm sóc hệ thống khách hàng đại lý hiện có và phát triển khách hàng mới tại khu vực được giao.',
        requirements: 'Có kinh nghiệm bán hàng từ 6 tháng, giao tiếp tốt, có xe máy đi lại.',
        benefits: 'Lương cứng 8 triệu + hoa hồng, phụ cấp xăng xe và điện thoại.',
        salary_min: 8000000, salary_max: 15000000,
        location: 'Quận 7, TP. Hồ Chí Minh', job_type: 'full-time', experience_level: '6 tháng - 1 năm',
        vacancies: 5
      },
      {
        companyIndex: 1, category: 'Chăm sóc khách hàng',
        title: 'Nhân viên Chăm sóc khách hàng (Bán thời gian)',
        description: 'Tiếp nhận và xử lý phản hồi của khách hàng qua hotline và fanpage trong ca làm việc linh hoạt.',
        requirements: 'Giọng nói dễ nghe, kiên nhẫn, có thể làm ca tối hoặc cuối tuần.',
        benefits: 'Lương theo giờ, thưởng hiệu suất tháng.',
        salary_min: 25000, salary_max: 35000, salary_negotiable: false,
        location: 'Quận 7, TP. Hồ Chí Minh', job_type: 'part-time', experience_level: 'Không yêu cầu',
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
    console.log('Đã tạo', jobsData.length, 'tin tuyển dụng mẫu.');

    // 4. Ung vien mau
    const candidateUserId = await upsertUser('candidate@joblink.vn', 'Candidate@123', 'candidate');
    let candidate = await candidateModel.findByUserId(candidateUserId);
    if (!candidate) {
      const candidateId = await candidateModel.createCandidate({
        userId: candidateUserId, fullName: 'Nguyen Van A'
      });
      await candidateModel.updateProfile(candidateId, {
        phone: '0901234567',
        address: 'Quận Đống Đa, Hà Nội',
        skills: 'JavaScript, HTML/CSS, Giao tiếp, Làm việc nhóm',
        experience: 'Đã tham gia 2 đồ án môn học về phát triển web tại trường.',
        education: 'Sinh viên năm 3, chuyên ngành Công nghệ thông tin'
      });
    }
    console.log('Ứng viên mẫu:', 'candidate@joblink.vn / Candidate@123');

    console.log('\nHoàn tất seed dữ liệu! Bạn có thể đăng nhập ngay bằng các tài khoản trên.');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi seed dữ liệu:', err);
    process.exit(1);
  }
}

seed();
