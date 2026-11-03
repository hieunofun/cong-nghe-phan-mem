# JobLink — Demo giữa kỳ INFO3004

Phạm vi: sản phẩm triển khai đến Docker, SCM/CI/CD, giám sát và PowerPoint.
Báo cáo Word, bảng phân công và tự đánh giá thành viên được làm riêng sau.

## 1. Chạy toàn bộ demo

Mở Docker Desktop, đợi Engine sẵn sàng. Với lỗi gắn đĩa Docker ở ổ E: đã gặp,
thoát Docker Desktop rồi mở bằng **Run as administrator**; giữ nguyên dữ liệu.

```powershell
Set-Location E:\trienkhaiphanmemcki
node scripts/devops-demo.js up
node scripts/devops-demo.js status
node scripts/devops-demo.js credentials
node scripts/webhook-demo.js start
```

Lần đầu cần tải images và build Jenkins, nên lâu hơn các lần chạy lại.
`up` chạy hai file Compose cùng một project, giữ hai volumes ứng dụng cũ.
Mật khẩu Jenkins/Grafana được sinh vào `.devops/credentials.env`, được loại khỏi
Git, build context và bản source đưa vào Jenkins. Giữ file này cùng các volumes.

| Dịch vụ | Địa chỉ trên máy demo | Đăng nhập |
|---|---|---|
| JobLink Web | http://localhost:3000 | Tài khoản ứng dụng bên dưới |
| AI health | http://localhost:5000/health | Không cần |
| Jenkins | http://localhost:8080 | `admin`, xem lệnh `credentials` |
| Grafana | http://localhost:3001/d/joblink-overview | `admin`, xem lệnh `credentials` |
| Prometheus | http://localhost:9090 | Không cần, chỉ localhost |
| MySQL | 127.0.0.1:3306 | Cấu hình demo trong Compose |

Blackbox Exporter chỉ dùng trong mạng Docker, không publish cổng ra máy.
Các cổng được publish đều bind `127.0.0.1`.

## 2. Jenkins: kiểm thử → build → triển khai → kiểm tra

Jenkins tự tạo **joblink-scm** (Jenkinsfile lấy từ GitHub `main`) và **joblink-local**
(bản đang làm trên máy). Job chính để demo là **joblink-scm**. Có thể chạy thủ công
bằng **Build with Parameters**, giữ `SOURCE_MODE=SCM`, `DEPLOY=true`, hoặc:

```powershell
node scripts/devops-demo.js build
node scripts/devops-demo.js check
```

Khi webhook đang bật, push lên `main` sẽ gọi **joblink-scm** tự động. Không chạy
thêm lệnh `build` cho cùng lần push. `build` là phương án chủ động chạy lại;
`build --local` và `check --local` dùng job dự phòng trên máy.

Pipeline có sáu stages:

1. **Source:** job SCM checkout chính xác SHA từ webhook; lưu commit và delivery ID
   để đối chiếu. Job LOCAL lấy snapshot trên máy và bỏ qua `.env`, uploads,
   node_modules, artifacts và Git metadata.
2. **Node tests:** cài dependencies bằng `npm ci`, chạy tests Node và xuất JUnit.
3. **Build images:** build Web và AI với tag riêng cho từng Jenkins build.
4. **AI tests:** chạy kiểm thử matching tiếng Việt/Anh ngay trong image AI vừa build.
5. **Deploy:** thay Web/AI bằng images mới, chờ healthcheck. MySQL phải healthy sẵn;
   pipeline không tạo lại MySQL hoặc thay schema.
6. **Smoke checks:** kiểm tra 12 luồng ứng dụng trên `http://web:3000` trong mạng Docker.

Lỗi kiểm thử/build sẽ dừng trước triển khai. Nếu lỗi từ lúc thay container hoặc khi
smoke checks, pipeline khôi phục hai image trước đó và vẫn báo build **FAILURE**.
Mỗi lần chạy lưu JUnit, smoke log và thông tin image/triển khai ở **Build Artifacts**.
Lệnh `build` còn lưu kết quả vào `artifacts/midterm-demo/` trên máy.

Jenkins dùng Docker socket của máy demo và chạy với quyền root trong container.
Cấu hình này dành cho lab trên localhost; người quản trị Jenkins có thể điều khiển
Docker của máy. Không dùng job này để chạy mã từ người không tin cậy.

## 3. GitHub webhook và SCM

Repo hiện dùng Git, nhánh `main`; remote:
`https://github.com/hieunofun/cong-nghe-phan-mem.git`.
GitHub Actions trong `.github/workflows/ci.yml` chạy tests khi push hoặc pull request,
đã đồng bộ Node 22 với Docker/Jenkins.

Webhook là địa chỉ server của nhóm nhận sự kiện GitHub gửi tới. GitHub không thể
gọi `localhost` trên máy anh, nên demo dùng đường đi:

**git push main → GitHub → HTTPS tunnel → receiver kiểm tra HMAC → Jenkins SCM → Docker**.

```powershell
node scripts/webhook-demo.js start
node scripts/webhook-demo.js status
```

`start` mở Cloudflare Quick Tunnel đến receiver `127.0.0.1:9010`, rồi tạo/cập nhật
webhook của repo bằng GitHub CLI. URL dạng `https://....trycloudflare.com/github-webhook/`
được in ra terminal. Script dùng tài khoản chủ repo đã lưu trong `gh` nếu có, không
đổi tài khoản GitHub CLI đang active. Máy khác cần `gh` đăng nhập với quyền quản lý
webhook của repo và cài `cloudflared`.

Đây là receiver riêng trong `scripts/github-webhook.js`, gọi Jenkins Remote API;
không phụ thuộc trigger GitHub plugin. Receiver chỉ chấp nhận chữ ký SHA-256 hợp lệ,
push của đúng repo/nhánh `main`; bỏ qua branch khác và delivery trùng. Secret và
trạng thái runtime chỉ lưu trong `.devops/`, không đẩy lên Git. Không đưa trang
quản trị Jenkins hoặc các cổng ứng dụng qua tunnel.

Xem GitHub **Settings → Webhooks → webhook đang active → Recent Deliveries**:
event `push` phải trả HTTP **202**; event `ping` trả **200**.
Xem Jenkins **joblink-scm → build mới → Build Artifacts** để đối chiếu
`source-commit.txt` và `webhook-delivery.txt` với commit và delivery GitHub.

Quick Tunnel là URL tạm thời: giữ terminal/process hoạt động khi demo. Mỗi lần
chạy lại `start`, script kiểm tra và cập nhật URL GitHub nếu tunnel đã thay đổi.
Cần Internet cho phần GitHub/webhook. Có thể dừng bằng:

```powershell
node scripts/webhook-demo.js stop
```

Lệnh này tắt GitHub hook và dừng hai processes do script quản lý. Jenkins vẫn có
`pollSCM('H/5 * * * *')` để kiểm tra thay đổi khoảng mỗi 5 phút sau lần SCM đầu tiên.
Polling là phương án dự phòng, khác cơ chế GitHub gửi webhook ngay khi push.

Thay đổi demo có thể nhìn thấy ngay sau triển khai:

```powershell
node scripts/demo-release.js "JobLink - demo giua ky"
git add public/demo-release.json
git commit -m "demo: update deployment marker"
git push origin main
```

Mở http://localhost:3000/demo-release.json trước và sau khi build SCM SUCCESS;
giá trị `revision` phải tăng theo đúng commit vừa push. Chi tiết trình tự 25–30 phút:
[DEMO_FLOW.md](DEMO_FLOW.md).

## 4. Giám sát và vận hành

Luồng giám sát: **Blackbox Exporter → Prometheus → Grafana**.
Prometheus thu thập mỗi 10 giây; Grafana đã provision datasource và dashboard.
Grafana kiểm tra thay đổi file dashboard mỗi 30 giây để tương thích bind mount
trên Windows; dashboard hiển thị số liệu mới mỗi 10 giây.

| Phép kiểm tra | Ý nghĩa |
|---|---|
| Web `/health` | HTTP 200 và JSON `status=ok` |
| AI `/health` | HTTP 200 và JSON `status=ok` |
| MySQL TCP | Cổng MySQL nội bộ nhận kết nối |
| Database API `/api/jobs?limit=1` | Web truy vấn được dữ liệu và trả về trường `jobs` |

Dashboard có trạng thái bốn probes, thời gian phản hồi, lịch sử availability,
tỷ lệ probes thành công trong 15 phút và số cảnh báo đang firing.
Tỷ lệ này chỉ là số liệu trong cửa sổ demo, không phải cam kết SLA.

Prometheus có ba rules: probe thất bại 30 giây, mất khả năng thu probe 30 giây,
và phản hồi trên 2 giây kéo dài 1 phút. Xem tại http://localhost:9090/alerts.
Chưa cấu hình Alertmanager hoặc thông báo ra email/Telegram.

```powershell
node scripts/monitoring-check.js
docker compose ps
docker compose logs --tail 50 web ai mysql
docker stats --no-stream
```

Để minh họa lỗi và hồi phục khi đang demo:

```powershell
docker compose stop ai
# Đợi AI chuyển DOWN; alert xuất hiện khi probe lỗi liên tục ít nhất 30 giây.
docker compose start ai
# Đợi AI healthy; probe và alert tự hồi phục ở lần thu thập tiếp theo.
```

Nếu gián đoạn demo, chạy lại `node scripts/devops-demo.js up`.

## 5. Dữ liệu và dừng demo

Volumes cũ: `joblink_mysql_data`, `joblink_uploads_data`.
Volumes mới: `joblink_jenkins_data`, `joblink_prometheus_data`, `joblink_grafana_data`.
Jenkins history, số liệu Prometheus và cấu hình Grafana được giữ qua lần tạo lại
container. Prometheus giữ tối đa 7 ngày hoặc 256 MB số liệu.

```powershell
node scripts/devops-demo.js stop
```

Lệnh trên chỉ dừng containers. **Không chạy `docker compose down -v`** vì sẽ xóa
volumes trong cấu hình tương ứng. Không xóa `.devops/credentials.env` khi giữ
volumes Jenkins/Grafana, vì tài khoản trong volume vẫn dùng mật khẩu cũ.

## 6. Demo ứng dụng và slides

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Ứng viên | candidate@joblink.vn | Candidate@123 |
| Doanh nghiệp | hr@vietsoft.vn | Company@123 |
| Admin | admin@joblink.vn | Admin@123 |

Trình tự demo: giới thiệu bài toán/công nghệ → push thay đổi → xem webhook và
Jenkins tự chạy → kiểm tra Docker → mở JobLink/demo-release → thử các vai trò và AI
→ mở Grafana, dừng/chạy lại AI và xem cảnh báo hồi phục. Xem [DEMO_FLOW.md](DEMO_FLOW.md).

PowerPoint giữa kỳ: `JobLink_Midterm_Presentation.pptx`.
Script tạo: `generate_joblink_midterm_slides.py`, dùng lại `Slides Template.pptx`.
Bản Docker 12 slides cũ vẫn giữ ở `JobLink_Docker_Presentation.pptx`.
Không có speaker notes trong bản giữa kỳ.

AI demo dùng TF-IDF/FAQ RAG; không có Groq key. OAuth, SMTP và thanh toán thật
chưa cấu hình. Các cảnh báo dependencies đã biết từ đợt trước không nằm trong
phần thay đổi CI/CD và giám sát này.

## Tham khảo cấu hình

- [Jenkins Pipeline syntax](https://www.jenkins.io/doc/book/pipeline/syntax/): stages, polling, post và artifacts.
- [Jenkins trên Docker](https://www.jenkins.io/doc/book/installing/docker/): image Jenkins và Docker CLI.
- [Prometheus multi-target exporter](https://prometheus.io/docs/guides/multi-target-exporter/): Blackbox probes và relabeling.
- [Grafana provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/): tự nạp datasource và dashboard.
- [GitHub webhook signatures](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries): kiểm tra chữ ký payload.
- [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/): URL HTTPS tạm thời cho demo.
