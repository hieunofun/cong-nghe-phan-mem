# JobLink — Luồng thuyết trình và demo giữa kỳ (25–30 phút)

Mục tiêu: đi đủ 5 phần thầy yêu cầu và chứng minh hệ thống thật chạy từ GitHub
đến Docker, có kiểm thử và giám sát. Không cần demo OAuth, email hay thanh toán thật
vì các tích hợp đó chưa cấu hình. PowerPoint không có speaker notes.

## Chuẩn bị trước buổi kiểm tra

Chạy trước giờ thuyết trình ít nhất 10 phút; không chờ đến lúc đứng trình bày mới
tải/build images lần đầu.

```powershell
Set-Location E:\trienkhaiphanmemcki
node scripts/devops-demo.js up
node scripts/webhook-demo.js start
node scripts/devops-demo.js status
node scripts/devops-demo.js check
node scripts/devops-demo.js credentials
```

Mở sẵn PowerPoint và các tab:

| Tab | Địa chỉ / nội dung |
|---|---|
| GitHub | Repo `hieunofun/cong-nghe-phan-mem`, nhánh `main`, file Jenkinsfile |
| Webhook | GitHub Settings → Webhooks → Recent Deliveries |
| Jenkins | http://localhost:8080/job/joblink-scm/ |
| Website | http://localhost:3000 |
| Dấu phiên bản | http://localhost:3000/demo-release.json |
| Grafana | http://localhost:3001/d/joblink-overview |
| Alerts | http://localhost:9090/alerts |

Đăng nhập Jenkins/Grafana trước. Chuẩn bị một cửa sổ PowerShell để thực hiện lệnh.
Giữ receiver/tunnel hoạt động, tắt sleep của máy trong lúc trình bày. Không mở
file credentials.env, .env hoặc secret webhook trên màn chiếu.

## Trình tự 25–30 phút

| Thời gian | Slides / màn hình | Thao tác cần làm | Điều cần chứng minh |
|---|---|---|---|
| 0–3 phút | Slides 1–4 | Giới thiệu bài toán và 3 vai trò | JobLink giải quyết việc gì, người dùng chính |
| 3–5 phút | Slides 5–6 | Chỉ sơ đồ Web ↔ AI ↔ MySQL và công cụ | Vai trò từng dịch vụ; Git/Jenkins/Docker/monitoring |
| 5–7 phút | Slide 7, GitHub, terminal | Xem Git và push thay đổi demo bên dưới | Mã nằm trên remote; push là đầu vào quy trình |
| 7–10 phút | Slides 8–9, Recent Deliveries, Jenkins | Xem push 202 và job SCM tự bắt đầu | Webhook thật, không bấm Build để giả lập tự động |
| 10–13 phút | Slides 10–14, terminal | Trong khi Jenkins chạy, xem Dockerfiles, images, containers, volumes | Đủ cài đặt/pull/build/run; hiểu image khác container |
| 13–16 phút | Jenkins, demo-release, slide 19 | Xem SUCCESS, JUnit, smoke checks, SHA và revision mới | Source đúng commit; kiểm thử/build/deploy thành công |
| 16–21 phút | Slide 20, website | Demo ứng viên, doanh nghiệp, admin và AI | Sản phẩm triển khai dùng được, dữ liệu từ MySQL |
| 21–26 phút | Slides 15–18, Grafana/Alerts | Dừng AI, chờ cảnh báo, chạy lại | Giám sát phản ánh sự cố và hồi phục thật |
| 26–28 phút | Slides 21–22 | Tổng kết kết quả và phạm vi local/lightweight | Nắm rõ đã làm gì và giới hạn của demo |
| 28–30 phút | Jenkins/Grafana/terminal | Dự phòng thời gian chờ và câu hỏi | Mọi dịch vụ được trả về healthy trước khi kết thúc |

## A. Demo Git push → webhook → Jenkins

Trước khi sửa, mở `/demo-release.json` để nhìn giá trị `revision` hiện tại.
Sau đó trong PowerShell:

```powershell
git status --short
git log --oneline -3
node scripts/demo-release.js "JobLink - demo giua ky"
git diff -- public/demo-release.json
git add public/demo-release.json
git commit -m "demo: update deployment marker"
git push origin main
git rev-parse HEAD
```

Chuyển sang GitHub Recent Deliveries, mở sự kiện `push` mới:

- Request có `ref: refs/heads/main`, trường `after` là SHA vừa push.
- Response HTTP 202: receiver đã kiểm tra chữ ký và đưa build vào hàng đợi Jenkins.
- Chuyển sang `joblink-scm`: build mới tự chạy. Không bấm thêm Build trong lượt này.

Trong Jenkins, chỉ sáu stages: Source → Node tests → Build images → AI tests →
Deploy → Smoke checks. Dùng thời gian chờ để trình bày phần Docker bên dưới.

Khi SUCCESS, mở Test Results và Build Artifacts:

- `node-tests.xml`: kết quả tests Node.
- `smoke-checks.log`: 12/12 luồng ứng dụng.
- `source-commit.txt`: phải trùng SHA từ `git rev-parse HEAD` và GitHub.
- `webhook-delivery.txt`: trùng delivery ID của sự kiện GitHub.
- `deployment.json`: image trước/sau, trạng thái verified.

Reload http://localhost:3000/demo-release.json: revision mới chứng minh image
vừa triển khai có nội dung từ commit mới. Chưa sửa file trực tiếp trong container.

## B. Demo Docker trong lúc pipeline đang build

Không cần cài lại Docker Desktop trước lớp. Cho thấy ứng dụng đã được đóng gói
và mở sẵn Docker Desktop > Images / Containers nếu cần minh họa trực quan.

```powershell
docker version
docker compose version
docker image ls --filter "reference=joblink-*"
node scripts/devops-demo.js status
docker volume ls --filter "name=joblink"
```

Mở `Dockerfile`, `Dockerfile.ai`, `docker-compose.yml`:

- `FROM`: Node 22 / Python 3.11; thư viện cài trong quá trình build.
- `CMD`: script mở HTTP server Web hoặc ứng dụng AI.
- Compose: MySQL healthy → AI healthy → Web; gọi nhau bằng tên service.
- Volumes: database và uploads tồn tại khi container được thay.
- Published ports chỉ bind 127.0.0.1; webhook có HTTPS tunnel riêng.

Nếu thầy yêu cầu tự chạy build/run, dùng các lệnh bên dưới **sau khi pipeline đã
xong**, tránh hai quy trình cùng thay containers:

```powershell
docker compose build web ai
docker compose up -d --wait --wait-timeout 180
node scripts/docker-check.js
```

Lệnh run này dùng tags `1.0` cho demo Docker cơ bản. Lần push Jenkins tiếp theo
sẽ triển khai tags riêng của build SCM. MySQL/uploads giữ nguyên.

## C. Demo sản phẩm khoảng 5 phút

| Vai trò | Thao tác demo chính | Kết quả cần cho thấy |
|---|---|---|
| Khách / ứng viên | Tìm `Node.js`, lọc ngành, mở chi tiết việc làm | Tin đúng và dữ liệu tiếng Việt hiển thị đúng |
| Ứng viên | Đăng nhập `candidate@joblink.vn` / `Candidate@123`, mở hồ sơ | Dashboard, hồ sơ và CV; thử chatbot tìm việc / gợi ý việc / matching |
| Doanh nghiệp | Đăng nhập `hr@vietsoft.vn` / `Company@123` | Tin tuyển dụng của doanh nghiệp, dashboard và danh sách ứng tuyển |
| Admin | Đăng nhập `admin@joblink.vn` / `Admin@123` | Tổng quan, tài khoản và doanh nghiệp |

Giới thiệu ngắn AI đang dùng TF-IDF/FAQ RAG, không cần Groq API key. Không tạo/xóa
hàng loạt dữ liệu để minh họa; tập trung vào các luồng đã kiểm tra.

## D. Demo monitoring và phục hồi khoảng 5 phút

Ban đầu Grafana phải hiện bốn ô UP, Alerts không có JobLinkServiceDown firing.
Chỉ ô Web / AI / MySQL TCP / Database API và biểu đồ thời gian phản hồi.

```powershell
docker compose stop ai
```

Chuyển sang Grafana: ô AI chuyển DOWN ở lần scrape tiếp theo. Chuyển Alerts:
JobLinkServiceDown chuyển pending rồi firing khi probe lỗi đủ 30 giây. Tổng thời
gian chờ có thể khoảng một phút vì có chu kỳ scrape và evaluation.

Trong lúc chờ, mở logs và CPU/RAM:

```powershell
docker compose logs --tail 20 ai
docker stats --no-stream
```

Sau khi thấy firing, khôi phục ngay:

```powershell
docker compose start ai
```

Đợi AI healthy, Grafana UP và cảnh báo resolved. Lịch sử vẫn còn đoạn DOWN; đây là
bằng chứng sự cố vừa diễn ra, không phải lỗi cần xóa. Chạy kiểm tra kết thúc:

```powershell
node scripts/devops-demo.js check
```

## Dự phòng nếu gặp sự cố

| Tình huống | Xử lý |
|---|---|
| Webhook URL cũ / tunnel mất kết nối | Chạy lại `node scripts/webhook-demo.js start`, xem `status`, rồi Redeliver push trong GitHub |
| Không có Internet | Demo `node scripts/devops-demo.js build --local`; nói rõ đây là chế độ dự phòng, dùng ảnh/log webhook đã kiểm tra để đối chiếu |
| Jenkins đang build lâu | Tiếp tục phần Docker; xem console log để biết đang cài thư viện hay build image |
| Lỡ bấm Build thêm | Đợi hàng đợi, tránh chạy `compose up` đồng thời với deploy |
| AI còn DOWN | `docker compose start ai`; kiểm tra `/health` và logs |
| Docker Engine chưa chạy | Mở Docker Desktop; lỗi gắn đĩa E: đã biết thì mở bằng Administrator |

Không reset Docker, không xóa volumes, không chạy `docker compose down -v`.

## Các ý cần nắm khi trả lời câu hỏi

- Image là bản đóng gói; container là lần chạy từ image; volume lưu dữ liệu ngoài
  vòng đời container.
- Dockerfile mô tả một image; Compose ghép nhiều dịch vụ, mạng, cổng và volumes.
- CI chạy kiểm thử/build khi code thay đổi; CD trong demo thay Web/AI rồi kiểm tra.
- Webhook do GitHub gửi khi push; polling do Jenkins định kỳ hỏi Git xem có commit mới.
- Healthcheck giúp chờ dịch vụ sẵn sàng; smoke checks kiểm tra luồng ứng dụng sau deploy.
- Pipeline không thay MySQL/schema khi deploy; nếu lỗi sau khi thay image thì quay
  lại images trước đó. Rollback đã có bằng chứng kiểm tra riêng.
- Monitoring: Blackbox kiểm tra HTTP/TCP, Prometheus lưu số liệu và đánh giá rules,
  Grafana trình bày dashboard. MySQL TCP và Database API là hai phép kiểm tra khác nhau.

Sau buổi demo, muốn dừng toàn bộ:

```powershell
node scripts/devops-demo.js stop
```

Lệnh này tắt webhook/tunnel nếu đã bật và dừng containers; giữ dữ liệu.
