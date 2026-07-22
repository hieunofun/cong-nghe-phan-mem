require('dotenv').config();
const pool = require('../config/db');

const categories = [
  [1, 'Công nghệ thông tin'],
  [2, 'Kinh doanh / Bán hàng'],
  [3, 'Marketing / Truyền thông'],
  [4, 'Kế toán / Kiểm toán'],
  [5, 'Nhân sự / Hành chính'],
  [6, 'Thiết kế / Sáng tạo'],
  [7, 'Chăm sóc khách hàng'],
  [8, 'Logistics / Vận tải']
];

const companies = [
  [
    1,
    'Tòa nhà Innovation, Quận Cầu Giấy, Hà Nội',
    'Công ty phát triển phần mềm chuyên cung cấp giải pháp web và mobile cho doanh nghiệp vừa và nhỏ.',
    '50-100 nhân viên'
  ],
  [
    2,
    'Tòa nhà Sunrise, Quận 7, TP. Hồ Chí Minh',
    'Hệ thống siêu thị bán lẻ thực phẩm sạch với hơn 30 chi nhánh trên toàn quốc.',
    '200-500 nhân viên'
  ]
];

const jobs = [
  [
    1,
    'Lập trình viên Backend Node.js',
    'Phát triển và bảo trì hệ thống API cho các sản phẩm web của công ty. Làm việc trực tiếp với nhóm Product để hiện thực hóa tính năng mới.',
    'Thành thạo JavaScript/Node.js, hiểu biết về MySQL hoặc MongoDB, biết sử dụng Git.',
    'Lương tháng 13, bảo hiểm sức khỏe, làm việc hybrid 2 ngày/tuần từ xa.',
    'Cầu Giấy, Hà Nội',
    '1-2 năm'
  ],
  [
    2,
    'Thực tập sinh Frontend (React)',
    'Hỗ trợ nhóm frontend xây dựng giao diện cho các dự án nội bộ. Phù hợp sinh viên năm 3, năm 4 muốn tích lũy kinh nghiệm thực tế.',
    'Biết HTML/CSS/JavaScript cơ bản, đã từng làm quen với React là lợi thế.',
    'Trợ cấp thực tập, cơ hội lên nhân viên chính thức sau 3 tháng.',
    'Cầu Giấy, Hà Nội',
    'Sinh viên năm 3-4'
  ],
  [
    3,
    'Nhân viên Kinh doanh khu vực TP.HCM',
    'Triển khai kế hoạch bán hàng, chăm sóc hệ thống khách hàng đại lý hiện có và phát triển khách hàng mới tại khu vực được giao.',
    'Có kinh nghiệm bán hàng từ 6 tháng, giao tiếp tốt, có xe máy đi lại.',
    'Lương cứng 8 triệu + hoa hồng, phụ cấp xăng xe và điện thoại.',
    'Quận 7, TP. Hồ Chí Minh',
    '6 tháng - 1 năm'
  ],
  [
    4,
    'Nhân viên Chăm sóc khách hàng (Bán thời gian)',
    'Tiếp nhận và xử lý phản hồi của khách hàng qua hotline và fanpage trong ca làm việc linh hoạt.',
    'Giọng nói dễ nghe, kiên nhẫn, có thể làm ca tối hoặc cuối tuần.',
    'Lương theo giờ, thưởng hiệu suất tháng.',
    'Quận 7, TP. Hồ Chí Minh',
    'Không yêu cầu'
  ]
];

const packages = [
  ['free', 'Miễn phí', 'Đăng tối đa 3 tin/tháng, không có tin VIP.'],
  ['basic', 'Basic', '10 tin/tháng, 2 tin VIP và 10 lượt xem CV ứng viên.'],
  ['pro', 'Pro', '30 tin/tháng, 10 tin VIP, tìm kiếm 50 CV ứng viên.'],
  ['enterprise', 'Enterprise', 'Không giới hạn tin đăng, tin VIP và xem CV ứng viên.']
];

async function migrate() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const [id, name] of categories) {
      await connection.query('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
    }
    for (const [id, address, description, scale] of companies) {
      await connection.query(
        'UPDATE companies SET address = ?, description = ?, scale = ? WHERE id = ?',
        [address, description, scale, id]
      );
    }
    for (const [id, title, description, requirements, benefits, location, experienceLevel] of jobs) {
      await connection.query(
        `UPDATE jobs
         SET title = ?, description = ?, requirements = ?, benefits = ?, location = ?, experience_level = ?
         WHERE id = ?`,
        [title, description, requirements, benefits, location, experienceLevel, id]
      );
    }
    for (const [code, name, description] of packages) {
      await connection.query(
        'UPDATE packages SET name = ?, description = ? WHERE code = ?',
        [name, description, code]
      );
    }

    await connection.commit();
    console.log('Đã cập nhật dữ liệu tiếng Việt có dấu thành công.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Lỗi cập nhật dữ liệu tiếng Việt:', error);
  process.exit(1);
});
