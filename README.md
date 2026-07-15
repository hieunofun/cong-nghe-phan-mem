# JobLink — Nền tảng tuyển dụng nhân sự

Một nền tảng tuyển dụng kiểu TopCV, xây dựng bằng **Node.js / Express / MySQL** cho backend và **HTML / CSS / JavaScript thuần** cho frontend. Hỗ trợ 3 vai trò: **Ứng viên**, **Doanh nghiệp**, **Quản trị viên (Admin)**.

## Tính năng chính

**Ứng viên:** đăng ký/đăng nhập, cập nhật hồ sơ (kỹ năng, kinh nghiệm, học vấn), tải lên CV và ảnh đại diện, tìm kiếm/lọc việc làm, ứng tuyển, lưu tin yêu thích, theo dõi trạng thái ứng tuyển.

**Doanh nghiệp:** đăng ký hồ sơ công ty (cần Admin duyệt), đăng/sửa/xoá/đóng tin tuyển dụng, quản lý ứng viên theo dạng pipeline (Mới ứng tuyển → Đang xem xét → Phỏng vấn → Đã nhận/Đã từ chối), cập nhật hồ sơ công ty + logo.

**Admin:** duyệt/từ chối hồ sơ doanh nghiệp, khoá/mở khoá tài khoản, quản lý toàn bộ tin tuyển dụng, quản lý danh mục ngành nghề, xem thống kê tổng quan hệ thống.

## Công nghệ sử dụng

- **Backend:** Node.js, Express, MySQL (mysql2), JWT (jsonwebtoken), bcryptjs, multer (upload file)
- **Frontend:** HTML/CSS/JavaScript thuần (không dùng framework), thiết kế responsive
- **Database:** MySQL 8.0
- **AI chatbot:** Flask AI service, Groq API, RAG từ FAQ nội bộ + dữ liệu JobLink realtime trong MySQL

## Yêu cầu hệ thống

- Node.js >= 18
- MySQL >= 8.0 (hoặc MariaDB tương thích)
- npm

## Hướng dẫn cài đặt

### 1. Cài đặt MySQL và tạo database

Nếu chưa có MySQL, cài đặt theo hệ điều hành của bạn rồi đăng nhập vào MySQL với quyền root:

```bash
mysql -u root -p
```

Tạo database và user riêng cho dự án (có thể đổi mật khẩu nếu muốn):

```sql
CREATE DATABASE joblink_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'joblink_user'@'localhost' IDENTIFIED BY 'joblink_password';
GRANT ALL PRIVILEGES ON joblink_db.* TO 'joblink_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Sau đó import schema (tạo bảng + seed sẵn 8 ngành nghề):

```bash
mysql -u joblink_user -p joblink_db < database/schema.sql
```

### 2. Cấu hình biến môi trường

Sao chép file mẫu và chỉnh sửa nếu cần (đặc biệt nếu bạn đổi mật khẩu DB ở bước trên):

```bash
cp .env.example .env
```

Nội dung `.env` mặc định:

```
PORT=3000
DB_HOST=localhost
DB_USER=joblink_user
DB_PASSWORD=joblink_password
DB_NAME=joblink_db
JWT_SECRET=doi_thanh_mot_chuoi_bi_mat_rieng_cua_ban
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://localhost:5000
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

**Lưu ý:** Hãy đổi `JWT_SECRET` thành một chuỗi ngẫu nhiên riêng nếu triển khai thực tế.

### 3. Cài đặt dependencies

```bash
npm install
```

### 4. Tạo dữ liệu mẫu (admin, doanh nghiệp, ứng viên, tin tuyển dụng demo)

```bash
npm run seed
```

Lệnh này sẽ tự động tạo các tài khoản demo (xem danh sách bên dưới) nếu chưa tồn tại — chạy lại nhiều lần không gây lỗi trùng dữ liệu.

### 5. Khởi động server

```bash
npm start
```

Hoặc chạy ở chế độ phát triển (tự khởi động lại khi sửa code) nếu đã cài `nodemon`:

```bash
npm run dev
```

Server sẽ chạy tại: **http://localhost:3000**

## Tài khoản demo

| Vai trò | Email | Mật khẩu | Ghi chú |
|---|---|---|---|
| Admin | admin@joblink.vn | Admin@123 | Quản trị toàn hệ thống |
| Doanh nghiệp | hr@vietsoft.vn | Company@123 | VietSoft Solutions — đã được duyệt |
| Doanh nghiệp | tuyendung@greenmart.vn | Company@123 | GreenMart Retail — đã được duyệt |
| Ứng viên | candidate@joblink.vn | Candidate@123 | Nguyen Van A |

## Cấu trúc thư mục

```
recruitment-platform/
├── server.js                 # Entry point Express app
├── config/db.js              # Kết nối MySQL pool
├── database/
│   ├── schema.sql            # Schema + seed danh mục ngành nghề
│   └── seed.js                # Script tạo tài khoản/tin demo
├── middleware/                # JWT auth, phân quyền, upload file (multer)
├── models/                    # Truy vấn DB (1 file / 1 bảng chính)
├── controllers/                # Logic xử lý nghiệp vụ
├── routes/                    # Định nghĩa API endpoint
├── public/                    # Frontend tĩnh (HTML/CSS/JS thuần)
│   ├── css/style.css
│   ├── js/                    # Logic JS cho từng trang
│   └── *.html                 # Các trang giao diện
└── uploads/                    # Nơi lưu CV, logo, avatar đã upload
```

## API Endpoints (tóm tắt)

Tất cả endpoint có tiền tố `/api`. Các route cần đăng nhập sẽ yêu cầu header `Authorization: Bearer <token>`.

- `POST /auth/register/candidate`, `POST /auth/register/company`, `POST /auth/login`, `GET /auth/me`
- `GET /jobs`, `GET /jobs/featured`, `GET /jobs/:id` (public) — `POST/PUT/DELETE /jobs` (doanh nghiệp)
- `POST /applications/:jobId` (ứng viên ứng tuyển) — `GET /applications/job/:jobId`, `PUT /applications/:id/status` (doanh nghiệp)
- `GET/PUT /candidates/me`, `POST /candidates/me/cv`, `POST /candidates/me/avatar`, `GET /candidates/me/applications`, `GET/POST/DELETE /candidates/me/saved-jobs`
- `GET/PUT /companies/me/profile`, `POST /companies/me/logo`, `GET /companies/:id` (public)
- `GET /admin/stats`, `GET/PUT /admin/companies`, `GET/PUT /admin/users`, `GET/DELETE /admin/jobs`, `GET/POST/DELETE /admin/categories`
- `GET /categories` (public)

## Release v0.2 Beta và tài liệu chấm điểm

- Release Notes: [`docs/RELEASE_v0.2.md`](docs/RELEASE_v0.2.md)
- Changelog: [`CHANGELOG.md`](CHANGELOG.md)
- Release Traceability: [`docs/RELEASE_TRACEABILITY.md`](docs/RELEASE_TRACEABILITY.md)
- User Stories / Acceptance Criteria: [`docs/USER_STORIES.md`](docs/USER_STORIES.md)
- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- API Documentation: [`docs/API.md`](docs/API.md)
- Deployment Notes: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Testing Plan: [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md)
- Self Assessment theo rubric Sommerville 80/20: [`SELF_ASSESSMENT.md`](SELF_ASSESSMENT.md)

## Kiểm thử

```bash
npm test
```

## Ghi chú quan trọng

- File CV/logo/avatar được lưu trực tiếp trên ổ đĩa server tại thư mục `uploads/` (không dùng cloud storage) — phù hợp cho mục đích học tập/demo.
- Mật khẩu được mã hoá bằng bcrypt trước khi lưu vào database.
- Doanh nghiệp đăng ký mới sẽ ở trạng thái `pending` và **không thể đăng tin** cho đến khi Admin duyệt.
- Dự án này được xây dựng cho mục đích học tập (đồ án môn học), thương hiệu "JobLink" không liên quan đến TopCV hay bất kỳ sản phẩm thương mại nào.
