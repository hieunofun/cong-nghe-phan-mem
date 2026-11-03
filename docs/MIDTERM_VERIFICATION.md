# Kiểm tra demo giữa kỳ JobLink — 04/11/2026

Phạm vi đã thực hiện: Jenkins/CI/CD, triển khai Docker, giám sát và PowerPoint.
Đây là biên bản kỹ thuật; báo cáo Word theo mẫu giảng viên làm riêng sau.

## Cập nhật GitHub SCM và webhook

Đã push cấu hình Docker/DevOps lên nhánh `main` của repo:
https://github.com/hieunofun/cong-nghe-phan-mem

Lượt kiểm tra tự động đầu tiên dùng commit
`459b449bc2f954e67d7eed605bf10a22ee449163`:

| Hạng mục | Kết quả |
|---|---|
| GitHub webhook | Active, push trả HTTP 202; ping trả 200 |
| Jenkins job | `joblink-scm` #1 SUCCESS; Jenkinsfile lấy từ remote |
| SHA source | Trùng SHA push; đối chiếu cả artifact và webhook delivery ID |
| Node tests | 57/57 PASS, gồm 8 tests receiver webhook |
| AI tests | 3/3 PASS |
| Smoke checks | 12/12 PASS |
| Dấu phiên bản | `/demo-release.json` được phục vụ từ image mới, revision 1 |
| GitHub Actions | CI SUCCESS cho cùng commit |

Bằng chứng máy đọc được: `artifacts/midterm-demo/webhook-verification.json`.
[GitHub Actions đã kiểm tra](https://github.com/hieunofun/cong-nghe-phan-mem/actions/runs/41693817702).
Mật khẩu và HMAC secret được giữ ở `.devops/`, không nằm trong commit.

`scripts/webhook-demo.js start` tạo/cập nhật URL tạm cho mỗi lần demo; receiver
chỉ chấp nhận chữ ký hợp lệ, đúng repo và nhánh `main`, chống delivery trùng.
Jenkins/Web/MySQL không được đưa trực tiếp qua tunnel. Hướng dẫn thuyết trình và
thao tác 25–30 phút nằm trong `DEMO_FLOW.md`.

Các kết quả Docker/LOCAL bên dưới là mốc kiểm tra ban đầu, trước khi bật SCM/webhook.

## Kết quả thực tế

| Hạng mục | Kết quả |
|---|---|
| Docker Engine | Khởi động lại thành công bằng Docker Desktop chạy Administrator; không reset, không xóa volumes |
| Containers | 7/7 healthy: MySQL, AI, Web, Jenkins, Blackbox, Prometheus, Grafana |
| Jenkins job chính | `joblink-local`, build #1 SUCCESS; đủ sáu stages |
| Node tests trong Jenkins | 49/49 PASS, Node v22.23.4, có JUnit report |
| AI tests trong image mới | 3/3 PASS, CV matching Việt/Anh và nhận diện kỹ năng |
| Smoke checks | 12/12 PASS trong mạng Docker và từ máy Windows |
| Giám sát | 8/8 PASS; 4 probes thành công, 6 scrape targets UP, 3 alert rules hợp lệ |
| Grafana | Datasource Prometheus kết nối; 8 panels; nhãn tiếng Việt UTF-8 và state timeline |
| Trình duyệt | Trang chủ có tin mẫu; cả 3 vai trò đăng nhập và mở dashboard; không lỗi JavaScript/API trong các luồng kiểm tra |
| UI DevOps | Jenkins hiển thị stages; Grafana có UP; Prometheus hiển thị rules |
| Phạm vi cổng | Toàn bộ published ports chỉ bind 127.0.0.1; Blackbox không publish cổng |
| Secrets | Không có `/app/.env` trong Web/AI; snapshot Jenkins không có `.env`; credentials mới được Git/build bỏ qua |
| PowerPoint | 22 slides, không có notes; đã export PowerPoint và kiểm tra không tràn text |

## Rollback sau lỗi triển khai

Đã tạo job Jenkins kiểm tra riêng, dùng cùng Jenkinsfile nhưng cố ý trỏ smoke
checks tới địa chỉ không phục vụ ứng dụng. Stages trước smoke vẫn chạy bình thường.

- Smoke checks thất bại; build kiểm tra kết thúc FAILURE như dự kiến.
- Post action tự khôi phục đúng hai image tags trước khi triển khai.
- Web/AI sau rollback healthy; MySQL không bị tạo lại.
- Artifact `deployment.json` ghi `status: rolled-back`.
- Job kiểm tra riêng đã xóa sau khi thu bằng chứng; job demo chính vẫn SUCCESS.

Đã sửa thứ tự lưu artifacts: lưu ở `post.cleanup` sau khi xử lý rollback để file
bằng chứng chứa trạng thái cuối cùng. `post.unsuccessful` cũng xử lý build bị hủy
hoặc timeout sau khi đã bắt đầu thay containers.

Bằng chứng: `artifacts/midterm-demo/rollback-check.json` và
`artifacts/midterm-demo/jenkins-rollback-console.log`.

## Kiểm tra cảnh báo bằng sự cố thật

Đã dừng AI, theo dõi Prometheus, rồi chạy lại AI trong khối phục hồi bắt buộc:

1. `probe_success{service="ai"}` chuyển từ 1 sang 0.
2. Rule `JobLinkServiceDown` chuyển sang firing sau thời gian chờ cấu hình.
3. Chạy lại AI; probe chuyển về 1.
4. Cảnh báo firing biến mất khi evaluation cập nhật.

Cả bốn bước PASS, lưu thời điểm UTC trong `artifacts/midterm-demo/alert-recovery.json`.
Kiểm thử thời gian chờ và hồi phục bằng `promtool test rules` cũng PASS.
Không cấu hình gửi cảnh báo ra hệ thống bên ngoài.

## Bảo toàn dữ liệu

Đối chiếu trước/sau triển khai Jenkins:

- MySQL giữ nguyên container ID và volume `joblink_mysql_data`.
- Dữ liệu vẫn có 4 tài khoản, 4 tin tuyển dụng, 2 doanh nghiệp.
- File đánh dấu trong `joblink_uploads_data` vẫn còn sau khi Web được tạo lại.
- File đánh dấu đã dọn sau khi kiểm tra.

Bằng chứng: `artifacts/midterm-demo/persistence-result.json`.

## File và lệnh bàn giao

- Pipeline: `Jenkinsfile`.
- Docker cơ bản: `Dockerfile`, `Dockerfile.ai`, `docker-compose.yml`, `.dockerignore`.
- DevOps bổ sung: `docker-compose.devops.yml`, `devops/`.
- Điểm chạy demo: `scripts/devops-demo.js`; hướng dẫn: `MIDTERM_DEMO.md`.
- Slides mới: `JobLink_Midterm_Presentation.pptx`; script: `generate_joblink_midterm_slides.py`.
- Bản slides Docker cũ và template được giữ nguyên.

```powershell
node scripts/devops-demo.js up
node scripts/devops-demo.js build
node scripts/devops-demo.js check
```

## Phần chưa xác minh hoặc chưa cấu hình

- GitHub push → webhook → SCM → triển khai đã được xác minh ở mục cập nhật đầu file.
  URL Quick Tunnel cần được giữ hoạt động trong lúc demo và cập nhật sau khi đổi URL.
- AI vẫn là lightweight TF-IDF/FAQ RAG; không có Groq API key.
- OAuth, SMTP, thanh toán thật và gửi cảnh báo ra ngoài chưa cấu hình.
- Không thay dependencies ứng dụng để xử lý các cảnh báo audit đã biết từ đợt trước.
- Các thay đổi đã có trước phiên này được giữ lại, gồm `database/schema.sql`.
