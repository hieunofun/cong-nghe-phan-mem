# JobLink — Nền tảng Tuyển dụng Nhân sự Tích hợp AI & Hệ thống DevOps Tự động hóa

> **Đồ án Cuối kỳ học phần Triển khai phần mềm (INFO3004):** Xem hướng dẫn kiến trúc và vận hành đầy đủ tại **[FINAL_DEMO.md](./FINAL_DEMO.md)** và kịch bản bảo vệ trực tiếp tại **[DEMO_FLOW.md](./DEMO_FLOW.md)**.
>
> **Triển khai Cloud (Vercel + Render + Supabase):** Xem **[VERCEL_RENDER_DEPLOY.md](./VERCEL_RENDER_DEPLOY.md)** · Bản phát hành nền tảng: **[v1.0.0 Final](./docs/RELEASE_v1.0.0.md)**.

JobLink là nền tảng tuyển dụng kết nối **Ứng viên**, **Doanh nghiệp** và **Quản trị viên (Admin)**, kết hợp dịch vụ AI chấm điểm độ phù hợp CV song ngữ Việt–Anh và Chatbot tư vấn việc làm theo thời gian thực. Dự án được đóng gói và tự động hóa triển khai hoàn chỉnh theo chuẩn **Production DevSecOps**.

---

## 1. Kiến trúc Hệ thống & Triển khai Phần mềm

```text
Git Push (main) ──► GitHub Actions CI (64 Node Tests + Python AI Tests + npm audit + Promtool)
       │
       └──► Signed HMAC Webhook ──► Jenkins Pipeline (8 Stages + Auto-Rollback)
                                           │
                                           ▼
     [Browser] ──► Nginx Gateway (:8088, Rate-Limit, Gzip, Security Headers)
                         │
                         ▼
                   JobLink Web (:3000, Node 22 Non-root, NODE_ENV=production, /metrics)
                    ├──► JobLink AI (:5000, Python 3.11 + Gunicorn WSGI, Token Auth, /metrics)
                    └──► MySQL 8.0 (:3306, utf8mb4, Named Volumes, Idempotent Migration & Backup)
                                           ▲
                                           │
     [Observability] Blackbox + White-box Prometheus (:9090) ──► Grafana 13 Panels (:3001)
                                           │
                                           └──► Alertmanager (:9093) ──► Webhook Sink / Discord
```

### Điểm nổi bật về Kỹ thuật Triển khai (DevOps / SRE)
- **Container hóa chuẩn Production (`Dockerfile`, `Dockerfile.ai`, `devops/nginx/Dockerfile`):** Tách biệt hoàn toàn dịch vụ, chạy dưới quyền **non-root** (`node` / `appuser`), AI vận hành bằng **Gunicorn WSGI** đa luồng kèm xác thực nội bộ `X-JobLink-AI-Token`, hỗ trợ `SIGTERM` graceful shutdown và xoay vòng log `json-file` (`10MB x 3`).
- **Reverse Proxy Gateway (`Nginx 1.27`):** Đứng trước ứng dụng tại cổng `8088`, nén Gzip, gắn HTTP Security Headers, chống brute-force đăng nhập bằng `limit_req_zone` và chặn truy cập từ bên ngoài vào các đường dẫn nội bộ (`/metrics`, `/internal/*`).
- **CI/CD Hai tầng & Tự động Rollback (`Jenkinsfile` + `.github/workflows/ci.yml`):** Kết hợp GitHub Actions trên đám mây và Jenkins 8 stages nhận sự kiện qua Webhook ký số HMAC-SHA256. Tự động kiểm thử 16 luồng nghiệp vụ sau deploy (`scripts/docker-check.js`) và tự động khôi phục bộ 3 image ổn định trước đó nếu phát hiện lỗi.
- **Full-Stack Observability (`Prometheus` + `Blackbox` + `Grafana` + `Alertmanager`):** Kết hợp 5 probes kiểm tra ngoài vỏ với **White-box `/metrics`** nội tại (RPS, 5xx rate, p95 latency, RSS/Heap memory, Event Loop lag), tự nạp dashboard 13 panels và điều phối cảnh báo `[FIRING]` / `[RESOLVED]` tự động qua Alertmanager.
- **Vận hành Day-2 (`scripts/apply-mysql-migration.js`, `scripts/db-backup.js`):** Tự động nâng cấp schema MySQL an toàn không mất dữ liệu và sao lưu/phục hồi cơ sở dữ liệu có kiểm tra toàn vẹn mã băm SHA-256.

---

## 2. Khởi chạy Nhanh bằng Docker & DevOps Stack (Khuyên dùng)

Yêu cầu: **Docker Desktop** (WSL 2) và **Node.js >= 22** cho CLI điều phối.

```powershell
# 1. Khởi chạy toàn bộ 9 dịch vụ (App + Nginx + Jenkins + Prometheus + Alertmanager + Grafana)
npm run devops:up

# 2. Xem mật khẩu quản trị tự sinh cho Jenkins và Grafana
node scripts/devops-demo.js credentials

# 3. Chạy kiểm tra tổng thể (16 smoke checks ứng dụng + 11 checks giám sát + trạng thái Jenkins)
npm run devops:check

# 4. Bật tunnel HTTPS nhận GitHub Webhook tự động khi git push (tùy chọn khi demo trực tuyến)
node scripts/webhook-demo.js start
```

| Thành phần | URL trên máy triển khai |
|---|---|
| **Cổng ứng dụng qua Nginx Gateway** | **http://localhost:8088** |
| **Ứng dụng Web trực tiếp** | http://localhost:3000 |
| **Jenkins Pipeline UI** | http://localhost:8080 |
| **Grafana Observability Dashboard** | http://localhost:3001/d/joblink-overview |
| **Prometheus Alerts & Targets** | http://localhost:9090/alerts |
| **Alertmanager UI** | http://localhost:9093 |

Nếu chỉ muốn chạy cụm ứng dụng cơ bản (`mysql`, `ai`, `web`, `gateway`) không kèm Jenkins/Monitoring:

```powershell
docker compose up -d --build --wait --wait-timeout 180
node scripts/docker-check.js
```

---

## 3. Tính năng Sản phẩm theo 3 Vai trò

- **Ứng viên:** Đăng ký/đăng nhập, quản lý hồ sơ chuyên môn, tải lên CV (PDF/DOCX Unicode) & ảnh đại diện, bật/tắt tự động ứng tuyển theo ngưỡng điểm AI, tìm kiếm/lọc việc làm phân trang, lưu tin và theo dõi toàn bộ lịch sử vòng đời đơn ứng tuyển.
- **Doanh nghiệp:** Quản lý hồ sơ công ty, đăng/sửa/đóng tin tuyển dụng, quản lý gói dịch vụ & thanh toán VietQR, tìm kiếm kho CV, lọc ứng viên và chấm điểm mức độ phù hợp bằng AI theo từng tin.
- **Quản trị viên (Admin):** Duyệt doanh nghiệp mới, duyệt giao dịch nâng cấp gói, khóa/mở tài khoản, quản lý danh mục ngành nghề và theo dõi thống kê toàn hệ thống.

### Tài khoản mẫu (tự động khởi tạo khi chạy lần đầu)

| Vai trò | Email | Mật khẩu | Ghi chú |
|---|---|---|---|
| **Admin** | `admin@joblink.vn` | `Admin@123` | Quản trị toàn hệ thống |
| **Doanh nghiệp** | `hr@vietsoft.vn` | `Company@123` | VietSoft Solutions — đã duyệt |
| **Doanh nghiệp 2** | `tuyendung@greenmart.vn` | `Company@123` | GreenMart Retail — đã duyệt |
| **Ứng viên** | `candidate@joblink.vn` | `Candidate@123` | Nguyễn Văn A |

---

## 4. Chạy Thủ công trên Môi trường Phát triển (Local Không Docker)

1. Tạo database MySQL 8.0 (`utf8mb4`) và nạp `database/schema.sql` (hoặc cấu hình Supabase theo [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)).
2. Sao chép file cấu hình mẫu và cài đặt thư viện:
   ```bash
   cp .env.example .env
   npm install
   npm run seed
   ```
3. Chạy backend Node.js và dịch vụ AI:
   ```bash
   npm run dev
   # Mở terminal thứ hai cho AI service:
   python -m pip install -r ai_service/requirements.render.txt pymysql
   npm run ai
   ```

---

## 5. Kiểm thử, Bảo mật & Vận hành

```bash
npm test                  # Chạy 64 automated tests (Node.js)
npm run test:ai           # Chạy kiểm thử AI matching song ngữ Việt - Anh
npm audit                 # Kiểm tra lỗ hổng thư viện (0 vulnerabilities)
npm run mysql:migrate     # Chạy nâng cấp schema MySQL an toàn (idempotent)
npm run db:backup         # Sao lưu MySQL kèm mã kiểm chứng SHA-256
npm run db:restore        # Phục hồi bản sao lưu MySQL gần nhất
npm run devops:stop       # Dừng toàn bộ containers an toàn, bảo toàn named volumes
```

---

## 6. Cấu trúc Thư mục Chính

```text
joblink-platform/
├── server.js                       # Express entrypoint (/health, /ready, /metrics, API, Security headers)
├── ai_service/                     # Dịch vụ AI Python (Flask + Gunicorn WSGI, RAG FAQ, CV Matcher)
├── config/ · controllers/ · models/# Phân tách tầng kết nối DB (MySQL/PG), nghiệp vụ và truy vấn
├── middleware/ · routes/ · utils/  # JWT RBAC, upload 4MB, Prometheus metrics collector
├── public/                         # Giao diện tĩnh responsive (HTML / CSS / JS thuần)
├── database/ · supabase/           # Schema MySQL gốc, dữ liệu mẫu và các bản migration
├── Dockerfile · Dockerfile.ai      # Đóng gói Production non-root cho Web và AI
├── docker-compose.yml              # Cụm container ứng dụng (MySQL, AI, Web, Nginx Gateway)
├── docker-compose.devops.yml       # Cụm DevOps (Jenkins, Blackbox, Prometheus, Alertmanager, Grafana)
├── Jenkinsfile                     # Pipeline CI/CD tự động hóa 8 stages kèm Auto-Rollback
├── devops/                         # Cấu hình Nginx, Jenkins Groovy init, Prometheus/Alertmanager & Grafana
├── scripts/                        # CLI điều phối DevOps, HMAC Webhook, Smoke/Monitoring checks, Backup
├── tests/                          # 14 bộ kiểm thử tự động (64 test cases)
└── docs/ · FINAL_DEMO.md           # Bộ tài liệu kiến trúc, API, kiểm thử và hướng dẫn vận hành
```

---

## 7. Thành viên Thực hiện

- **Hiếu** — [@hieunofun](https://github.com/hieunofun)
- **Nguyên** — [@Nguyen16112006](https://github.com/Nguyen16112006)
- **Phương Anh** — [@Phuonganh149](https://github.com/Phuonganh149)
- **Huy** — `Huyday` (Triển khai Docker, CI/CD Jenkins, Webhook & Hệ thống Giám sát)

Chi tiết phân công và cách đối chiếu lịch sử đóng góp trên Git xem tại [CONTRIBUTORS.md](./CONTRIBUTORS.md).
