# JobLink — Đồ Án Cuối Kỳ Triển Khai Phần Mềm (INFO3004)

Tài liệu kỹ thuật và kịch bản vận hành chính thức cho **Đồ án Cuối kỳ học phần Triển khai phần mềm (INFO3004 — Đại học CMC)**.  
Hệ thống hoàn thiện toàn bộ chu trình **DevSecOps & Production Deployment**: Quản lý mã nguồn (Git + GitHub Actions CI) → Webhook ký số HMAC-SHA256 → Jenkins CI/CD 8 bước (có kiểm toán bảo mật, DB migration tự động & auto-rollback) → Kiến trúc Container Production (Nginx Reverse Proxy + Express Non-root + Gunicorn WSGI AI + MySQL 8.0) → Giám sát toàn diện Blackbox + White-box `/metrics` (Prometheus + Grafana 13 panels + Alertmanager gửi cảnh báo tự động) → Quy trình vận hành Day-2 (Backup/Restore kiểm chứng SHA-256 & xoay vòng log).

---

## 1. Kiến trúc triển khai

Máy ảo Google Cloud chạy 10 container thường trực (4 ứng dụng, 6 giám sát). Jenkins chạy trên máy điều phối. SonarQube được bật qua profile `sonar` để phân tích mã nguồn.

```text
[Người dùng / Trình duyệt]
        │
        ▼  http://localhost:8088 (Cổng Reverse Proxy thống nhất)
┌───────────────────────────────────────────────────────────────────┐
│ joblink-gateway (Nginx 1.27 Alpine)                               │
│  • Gzip, Rate-limit chống brute-force (/api/auth/*: 10 req/s)     │
│  • Security Headers, chặn truy cập ngoài vào /metrics & /internal │
└───────┬───────────────────────────────────────────────────────────┘
        │  mạng nội bộ joblink-network
        ▼
┌──────────────────────────────┐   X-JobLink-AI-Token   ┌───────────────────────────────┐
│ joblink-web (Node 22 Alpine) │ ─────────────────────► │ joblink-ai (Python 3.11 Slim) │
│  • NODE_ENV=production       │                        │  • Gunicorn WSGI (4 threads)  │
│  • Non-root (USER node)      │                        │  • Non-root (USER appuser)    │
│  • SIGTERM graceful shutdown │                        │  • TF-IDF / FAQ RAG / CV AI   │
│  • /health, /ready, /metrics │                        │  • /health, /metrics          │
└───────┬──────────────────────┘                        └───────────────┬───────────────┘
        │                                                               │
        └──────────────────────────► ┌────────────────────────┐ ◄───────┘
                                     │ joblink-mysql (8.0)    │
                                     │  • utf8mb4 + Volumes   │
                                     │  • Idempotent Migrate  │
                                     └────────────────────────┘

[Tầng CI/CD & Full-Stack Observability — docker-compose.devops.yml]
 • GitHub Push (main) ──► Cloudflare HTTPS Tunnel ──► Signed HMAC Receiver (127.0.0.1:9010)
 • joblink-jenkins (127.0.0.1:8080)      : Pipeline local + Jenkinsfile.ssh-deploy + Auto-Rollback
 • joblink-blackbox (internal:9115)      : 5 HTTP/TCP probes (Gateway, Web, AI, MySQL, DB API)
 • joblink-node-exporter (127.0.0.1:9100): Giám sát tài nguyên Host (CPU, RAM, Disk, Network)
 • joblink-cadvisor (127.0.0.1:8081)     : Giám sát tài nguyên từng Container (CPU, RAM, Net I/O)
 • joblink-prometheus (127.0.0.1:9090)   : 12 scrape targets (4 lớp) + 7 alert rules
 • joblink-alertmanager (127.0.0.1:9093) : Điều phối [FIRING] / [RESOLVED] tới Webhook Sink & Discord
 • joblink-grafana (127.0.0.1:3001)      : Provisioning-as-Code 2 Dashboards (13 + 6 panels)
 • joblink-sonarqube (--profile sonar)   : Phân tích mã tĩnh SAST (:9000) theo sonar-project.properties
```

---

## 2. Khởi chạy Toàn bộ Hệ thống Bằng Một Điểm Vào

Mở **Docker Desktop** và đợi Engine sẵn sàng (nếu gặp lỗi gắn đĩa WSL ở ổ `E:`, mở Docker Desktop bằng **Run as administrator**):

```powershell
Set-Location E:\trienkhaiphanmemcki
node scripts/devops-demo.js up
node scripts/devops-demo.js status
node scripts/devops-demo.js credentials
node scripts/webhook-demo.js start
```

| Dịch vụ | Địa chỉ truy cập (Localhost-bound) | Thông tin xác thực |
|---|---|---|
| **Nginx Reverse Proxy Gateway** | **http://localhost:8088** | Cổng giao diện người dùng chuẩn Production |
| **JobLink Web (Direct)** | http://localhost:3000 | Tài khoản demo 3 vai trò bên dưới |
| **AI Service Health** | http://localhost:5000/health | Public healthcheck (API nghiệp vụ yêu cầu Token) |
| **Jenkins CI/CD** | http://localhost:8080 | `admin` — xem bằng `node scripts/devops-demo.js credentials` |
| **Grafana Dashboard (13 Panels)** | http://localhost:3001/d/joblink-overview | `admin` — xem bằng `node scripts/devops-demo.js credentials` |
| **Prometheus UI & Alerts** | http://localhost:9090/alerts | Không cần (chỉ bind `127.0.0.1`) |
| **Alertmanager UI** | http://localhost:9093 | Không cần (chỉ bind `127.0.0.1`) |
| **MySQL 8.0** | `127.0.0.1:3306` | `joblink_user` / `joblink_password` (`joblink_db`) |

---

## 3. Quy trình CI/CD Hai Tầng (GitHub Actions + Jenkins 8 Stages)

### 3.1. Tầng 1 — GitHub Actions CI (`.github/workflows/ci.yml`)
Tự động kích hoạt trên mọi lệnh `push` và `pull_request`:
1. **Job `test-and-audit`:** Cài đặt Node 22 + Python 3.11, chạy toàn bộ **64 Node unit/integration tests**, kiểm toán lỗ hổng `npm audit --audit-level=high` (**0 vulnerabilities**), và chạy **3 Python AI multilingual tests**.
2. **Job `docker-and-monitoring-verify`:** Kiểm tra cú pháp `docker compose config`, build cả 3 image (`web`, `ai`, `gateway`), xác minh container chạy bằng **non-root UID (`!= 0`)**, chạy AI test cô lập mạng (`--network none`), và kiểm chứng cấu hình Prometheus + unit test luật cảnh báo bằng `promtool`.

### 3.2. Tầng 2 — Jenkins CD Pipeline (`Jenkinsfile` — 8 Stages)
Khi có `git push origin main`, GitHub gửi sự kiện qua HTTPS tunnel vào `scripts/github-webhook.js` (kiểm tra chữ ký HMAC-SHA256, chống replay delivery) và kích hoạt job **`joblink-scm`**:

1. **Source:** Checkout đúng mã SHA commit từ webhook, lưu `source-commit.txt` và `webhook-delivery.txt`.
2. **Node tests:** Cài đặt sạch bằng `npm ci`, chạy 64 tests và xuất báo cáo `node-tests.xml` (JUnit).
3. **Security & config audit:** Chạy `npm audit --omit=dev --audit-level=high`, kiểm tra `docker compose config`, và chạy `promtool test rules` kiểm thử các kịch bản cảnh báo.
4. **Build images:** Đóng gói 3 immutable images (`joblink-web`, `joblink-ai`, `joblink-gateway`) gắn tag riêng `${BUILD_TAG}`.
5. **AI & container checks:** Chạy kiểm thử AI song ngữ Việt–Anh với `--network none` và xác nhận UID chạy trong container khác `0` (non-root).
6. **Registry publish *(tùy chọn)*:** Đẩy image gắn mã SHA lên Container Registry (`GHCR` / `Docker Hub`) khi bật `PUSH_REGISTRY=true`.
7. **DB migrate & deploy:** Cấp quyền volume an toàn (`uploads-perms`), cập nhật `ai`, `web`, `gateway`; khi `web` khởi động, `scripts/apply-mysql-migration.js` tự động nâng cấp schema MySQL idempotent mà không mất dữ liệu.
8. **Smoke checks:** Chạy `scripts/docker-check.js` kiểm tra **16 hạng mục thực tế** (liveness, DB readiness `/ready`, security headers, chặn lộ link reset password ở production, tìm kiếm UTF-8, đăng nhập 3 vai trò, dashboard, AI RAG/matching, `/metrics` và tường lửa Nginx Gateway chặn `/metrics` từ bên ngoài).

**Cơ chế Tự động Rollback:** Nếu bước 7 hoặc 8 thất bại (hoặc timeout), khối `post.unsuccessful` tự động gọi `node scripts/ci-deploy.js rollback` khôi phục bộ 3 image ổn định liền trước, giữ nguyên MySQL/volumes, lưu bằng chứng vào `deployment.json` và giữ trạng thái build `FAILURE`.

### 3.3. SonarQube và pipeline SSH lên Google Cloud

- **SonarQube:** Khởi chạy profile `sonar` trên máy Jenkins, dùng `SONAR_HOST_URL=http://sonarqube:9000` và Jenkins credential `joblink-sonar-token`. Bật `RUN_SONARQUBE` để Jenkins chờ Quality Gate trước khi build image.
- **`joblink-ssh-deploy`:** Bật `DEPLOY_REMOTE` và chọn Registry, VPS cùng `PUBLIC_URL`. Job đẩy ba image theo SHA, kết nối SSH bằng credential `joblink-prod-ssh` và xác thực `known_hosts`. Sau smoke test, job kiểm tra `/gateway-health` và `/ready` trả `200`, `/metrics` trả `403`, rồi mới xác nhận rollout. Nếu kiểm tra lỗi, job gọi rollback trên VPS.
- **URL trình diễn:** [JobLink trên Google Cloud](http://136.110.25.226/). Với registry demo `127.0.0.1:5011/joblink`, duy trì SSH reverse tunnel từ VPS về registry trong lúc đẩy và kéo image.

---

## 4. Điểm nhấn Bảo mật Triển khai (DevSecOps Hardening)

- **Chạy chuẩn `NODE_ENV=production` trong Docker:** Phân tách cấu hình lưu trữ `STORAGE_DRIVER=local` và `DB_CLIENT=mysql` trong `server.js` / `storageService.js`, triệt tiêu hoàn toàn hành vi trả `reset_url` qua JSON của chế độ dev.
- **Non-Root Containers & Gunicorn Production WSGI:** `joblink-web` chạy dưới user `node` (UID 1000), `joblink-ai` chạy dưới user hệ thống `appuser` (UID 1001) bằng WSGI server **Gunicorn** (`1 worker x 4 threads`) thay vì Flask dev server, kèm xác thực nội bộ bằng header `X-JobLink-AI-Token`.
- **Tường lửa tầng Nginx Reverse Proxy:** Chặn truy cập bên ngoài tới `/metrics` và `/internal/*` (trả `HTTP 403`), giới hạn tốc độ `10 req/s` chống dò mật khẩu trên `/api/auth/login` & `/api/auth/forgot-password`, đính kèm bộ HTTP Security Headers chuẩn.
- **0 Lỗ hổng Thư viện:** Đã nâng cấp `nodemailer@10`, cập nhật lockfile và thay `nodemon` bằng `node --watch` nguyên bản của Node 22 (`npm audit` báo **0 vulnerabilities**).

---

## 5. Giám sát ứng dụng, máy chủ và container

Prometheus thu thập **12 scrape targets** mỗi 10 giây:
- **5 Blackbox Probes:** `gateway` (`/gateway-health`), `web` (`/health`), `ai` (`/health`), `mysql` (TCP `3306`), và `database-api` (`/api/jobs?limit=1`).
- **White-box Metrics nội tại (`/metrics`):**
  - `joblink-web`: Tổng request theo route/status (`joblink_http_requests_total`), tỷ lệ lỗi `4xx`/`5xx`, histogram độ trễ API p95 (`joblink_http_request_duration_seconds`), bộ nhớ RSS/Heap (`nodejs_resident_memory_bytes`), độ trễ Event Loop (`nodejs_eventloop_lag_seconds`).
  - `joblink-ai`: Lưu lượng xử lý AI (`joblink_ai_requests_total`), thời gian xử lý cộng dồn và số lượng tài liệu RAG.
- **Node Exporter và cAdvisor:** Thu thập tài nguyên máy chủ và từng container. Grafana nạp `joblink-overview` (13 panel) và `joblink-infrastructure` (6 panel).
- **7 luật cảnh báo và Alertmanager:**
  - `JobLinkServiceDown`, `JobLinkProbeMissing`, `JobLinkSlowResponse`, `JobLinkHighErrorRate` (5xx), `JobLinkHighMemoryUsage` (> 400 MiB).
  - `JobLinkHostHighCPU` (> 85% trong 2 phút) và `JobLinkContainerHighMemory` (> 512 MiB trong 2 phút).
  - Khi sự cố xảy ra hoặc hồi phục, **Alertmanager (`:9093`)** tự động bắn webhook `[FIRING]` và `[RESOLVED]` tới sink nội bộ `/internal/alert-webhook` (đếm trên panel 13 của Grafana) và chuyển tiếp sang **Discord / Slack** nếu cấu hình `DISCORD_WEBHOOK_URL`.

Kiểm tra nhanh toàn bộ hệ thống giám sát và diễn tập sự cố:

```powershell
node scripts/monitoring-check.js
node scripts/verify-alert-recovery.js
```

---

## 6. Vận hành Day-2: Migration, Sao lưu Phục hồi & Quản lý Log

- **Xoay vòng Log tự động:** Mọi dịch vụ trong cả 2 file Compose đều cấu hình `json-file` với `max-size: "10m"` và `max-file: "3"`, chống tràn ổ đĩa khi chạy dài ngày.
- **Graceful Shutdown (`SIGTERM` / `SIGINT`):** Khi cập nhật phiên bản mới, container đóng nhận kết nối mới, hoàn tất request dở dang và giải phóng MySQL connection pool trước khi thoát.
- **Sao lưu & Phục hồi MySQL có kiểm chứng SHA-256:**

```powershell
# Tạo bản sao lưu .sql kèm manifest SHA-256 vào .devops/backups/ (giữ 5 bản mới nhất)
npm run db:backup

# Xem danh sách các bản sao lưu hiện có
node scripts/db-backup.js list

# Kiểm tra checksum SHA-256 và phục hồi bản sao lưu mới nhất (hoặc chỉ định đường dẫn file)
npm run db:restore

# Dừng toàn bộ hệ thống an toàn sau buổi bảo vệ (giữ nguyên toàn bộ dữ liệu & volumes)
npm run devops:stop
```

---

## 7. Tài khoản Demo & Trình chiếu Bảo vệ Cuối kỳ

| Vai trò | Email | Mật khẩu |
|---|---|---|
| **Ứng viên** | `candidate@joblink.vn` | `Candidate@123` |
| **Doanh nghiệp** | `hr@vietsoft.vn` | `Company@123` |
| **Quản trị viên (Admin)** | `admin@joblink.vn` | `Admin@123` |

- **Slide Bảo vệ Cuối kỳ (24 trang):** `JobLink_Final_Presentation.pptx` (sinh tự động bằng `py -3.14 generate_joblink_final_slides.py`).
- **Minh chứng trên máy trình chiếu:** `artifacts/defense-2026-11-23/` có bản báo cáo và ảnh/log thực nghiệm. Trình bày kết quả rollback và cảnh báo từ bộ minh chứng, thực hiện diễn tập chịu lỗi trên môi trường thử.
- **Kịch bản thuyết trình & thao tác trực tiếp 25–30 phút:** xem [DEMO_FLOW.md](./DEMO_FLOW.md).
- **Triển khai Cloud thay thế (Vercel + Render + Supabase):** xem [VERCEL_RENDER_DEPLOY.md](./VERCEL_RENDER_DEPLOY.md).

| Người trình bày | Thao tác chính | Minh chứng mở sẵn |
|---|---|---|
| Nguyễn Doãn Huy | Giải thích Dockerfile, Compose và Nginx Gateway | `docker compose ps`, `/gateway-health` và `/metrics` |
| Trần Đức Nguyên | Trình bày GitHub Actions, Jenkins và SonarQube | CI run, Jenkins stage view và kết quả Quality Gate |
| Nguyễn Trần Tuấn Khôi | Demo VPS, deployment theo SHA và rollback | URL Google Cloud, log SSH, bản sao lưu SHA-256 |
| Phan Văn Hiếu | Trình diễn chatbot và chấm CV | Luồng ứng viên, kết quả 3 kiểm thử AI |
| Niê Phương Anh | Mở Prometheus và hai dashboard Grafana | 12 targets, 7 luật, tài nguyên máy chủ và container |
| Nguyễn Quang Trung | Kiểm thử và tổng kết nghiệm thu | Log 64 Node tests, 16 smoke checks và 12 kiểm tra giám sát |
