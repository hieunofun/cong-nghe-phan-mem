# JobLink — Kịch bản Thuyết trình & Demo Bảo vệ Cuối kỳ INFO3004 (25–30 phút)

Mục tiêu: Trình bày mạch lạc từ bài toán đến kiến trúc Production Container (Nginx Gateway + Web Non-root + AI Gunicorn + MySQL), chứng minh trực tiếp luồng **Git Push → Signed Webhook → Jenkins 8 Stages → Deploy / Auto-Rollback**, kiểm chứng **Full-Stack Observability (Blackbox + White-box `/metrics` + Alertmanager)** và thao tác vận hành **Backup/Restore SHA-256**.

---

## Chuẩn bị trước giờ bảo vệ (10–15 phút trước khi lên bảng)

```powershell
Set-Location E:\trienkhaiphanmemcki
node scripts/devops-demo.js up
node scripts/webhook-demo.js start
node scripts/devops-demo.js status
node scripts/devops-demo.js check
node scripts/devops-demo.js credentials
```

Mở sẵn file trình chiếu **`JobLink_Final_Presentation.pptx`** và 8 tab trình duyệt:

| Tab | Địa chỉ / Nội dung cần mở sẵn |
|---|---|
| 1. GitHub | Repo `hieunofun/cong-nghe-phan-mem`, nhánh `main`, file `Jenkinsfile` và tab **Actions** |
| 2. Webhook | GitHub **Settings → Webhooks → Recent Deliveries** (hoặc dùng CLI `deliveries`) |
| 3. Jenkins | `http://localhost:8080/job/joblink-scm/` (đã đăng nhập `admin`) |
| 4. Gateway App | `http://localhost:8088` (Cổng Nginx Reverse Proxy chính thức) |
| 5. Dấu phiên bản | `http://localhost:8088/demo-release.json` |
| 6. Grafana | `http://localhost:3001/d/joblink-overview` (Dashboard 13 panels, refresh `10s`) |
| 7. Prometheus Alerts | `http://localhost:9090/alerts` (5 luật cảnh báo) |
| 8. Alertmanager | `http://localhost:9093` (Theo dõi điều phối thông báo cảnh báo) |

---

## Phân bổ Thời lượng 25–30 phút

| Phút | Màn hình / Slides | Nội dung thao tác | Điểm ăn điểm với Hội đồng |
|---|---|---|---|
| **0–3'** | Slides 1–4 | Bài toán tuyển dụng JobLink và 3 vai trò người dùng | Sản phẩm thực tế, giải quyết luồng CV & AI rõ ràng |
| **3–6'** | Slides 5–7 | Kiến trúc 9 containers: Nginx Gateway → Web → Gunicorn AI → MySQL + DevOps | Có Reverse Proxy, chạy `NODE_ENV=production` và non-root |
| **6–9'** | Slides 8–10 + Terminal | Thực hiện `git push` cập nhật marker phiên bản; đối chiếu HMAC Webhook HTTP 202 | Trigger tự động 100%, chống giả mạo chữ ký & chống lặp delivery |
| **9–13'** | Slides 11–15 + Terminal | Trong lúc Jenkins chạy 8 stages: mở `Dockerfile`, `Dockerfile.ai`, `default.conf`, xem non-root & tường lửa Nginx chặn `/metrics` | Giải thích sâu về DevSecOps: `0` lỗ hổng `npm audit`, Gunicorn WSGI, Token nội bộ |
| **13–16'** | Jenkins + Gateway | Xem đủ 8 ô xanh trên Jenkins, JUnit 64 tests, 16 smoke checks, reload `/demo-release.json` | Truy vết đầu-cuối từ mã SHA commit tới container đang phục vụ |
| **16–20'** | Slide 21 + Website (`:8088`) | Đăng nhập Ứng viên, Doanh nghiệp, Admin; thử Chatbot tìm việc & AI chấm điểm CV | Nghiệp vụ mượt qua Nginx Gateway, dữ liệu tiếng Việt chuẩn `utf8mb4` |
| **20–25'** | Slides 16–19 + Grafana | Chỉ 5 ô UP + biểu đồ White-box RPS/p95/Memory; dừng `ai` để xem Alertmanager bắn `[FIRING]` rồi khởi động lại xem `[RESOLVED]` | Giám sát cả trong lẫn ngoài + cảnh báo tự động hai chiều |
| **25–28'** | Slides 20, 22–24 + Terminal | Chạy `npm run db:backup` tạo bản sao lưu MySQL có SHA-256; tổng kết kết quả & trả lời câu hỏi | Đầy đủ vận hành Day-2: Migration idempotent, Backup, Log rotation |

---

## Kịch bản Thao tác Chi tiết trên Terminal

### Phần A — Trigger CI/CD Tự động từ Git Push

Xem số `revision` hiện tại tại `http://localhost:8088/demo-release.json`, sau đó chạy:

```powershell
node scripts/demo-release.js "JobLink - bao ve cuoi ky INFO3004"
git diff -- public/demo-release.json
git add public/demo-release.json
git commit -m "demo: update final deployment marker"
git push origin main
git rev-parse HEAD
node scripts/webhook-demo.js deliveries
```

- Mở Jenkins `joblink-scm`: Pipeline 8 bước tự động kích hoạt (`Source` → `Node tests` → `Security & config audit` → `Build images` → `AI & container checks` → `Registry publish` → `DB migrate & deploy` → `Smoke checks`).
- Sau khi báo `SUCCESS`, tải lại `http://localhost:8088/demo-release.json` để xác nhận `revision` mới.

### Phần B — Chứng minh Bảo mật Container & Tường lửa Nginx Gateway

```powershell
# Kiểm tra các container và trạng thái healthy
node scripts/devops-demo.js status

# Chứng minh Nginx Gateway phục vụ ứng dụng bình thường nhưng chặn truy cập trái phép vào /metrics (HTTP 403)
curl.exe -i http://localhost:8088/gateway-health
curl.exe -i http://localhost:8088/metrics

# Trong khi nội bộ Prometheus vẫn thu thập được White-box metrics từ cổng nội bộ
curl.exe -s http://localhost:3000/metrics | Select-Object -First 15
```

### Phần C — Diễn tập Sự cố, Cảnh báo Alertmanager & Tự Phục hồi

```powershell
# 1. Giả lập sập dịch vụ AI
docker compose stop ai

# Quan sát Grafana (ô AI chuyển DOWN), Prometheus Alerts (JobLinkServiceDown -> FIRING sau 30s)
# và panel "Alertmanager đã gửi / Webhook Notifications" tăng bộ đếm FIRING.
curl.exe -s http://localhost:3000/internal/alert-webhook

# 2. Khôi phục dịch vụ AI
docker compose start ai

# Quan sát AI trở lại UP, cảnh báo tự tắt và Alertmanager gửi thông báo RESOLVED.
```

### Phần D — Chứng minh Vận hành Day-2 (DB Backup & Kiểm tra Tổng thể)

```powershell
npm run db:backup
node scripts/db-backup.js list
npm run devops:check
```

---

## Xử lý Tình huống Dự phòng

| Tình huống | Cách xử lý tức thì |
|---|---|
| Mất mạng Internet / Tunnel đổi địa chỉ | Chạy `node scripts/webhook-demo.js start` hoặc chạy chế độ offline `node scripts/devops-demo.js build --local` |
| AI còn đang tắt sau khi minh họa lỗi | `docker compose start ai` rồi kiểm tra lại bằng `npm run devops:check` |
| Cần dừng toàn bộ hệ thống sau buổi bảo vệ | `npm run devops:stop` (**Tuyệt đối không dùng** `docker compose down -v` để giữ dữ liệu) |
