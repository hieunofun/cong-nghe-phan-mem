# Contributors — Nhóm 02 (Lớp 24IT3 · Trường Đại học CMC)

**Học phần:** Triển khai phần mềm (INFO3004)  
**Giảng viên hướng dẫn:** Đặng Quốc Hữu  
**Đề tài:** Xây dựng nền tảng tuyển dụng JobLink tích hợp Trí tuệ nhân tạo

| TT | MSSV | Họ và Tên | Vai trò chính | Tài khoản Git / GitHub | Phạm vi đóng góp chính |
|---:|---|---|---|---|---|
| 1 | `BIT240014` | **Niê Phương Anh** | **Monitoring** | [@Phuonganh149](https://github.com/Phuonganh149) | Thiết kế & triển khai hệ thống giám sát Prometheus, Grafana (Provisioning-as-Code 2 dashboards), Blackbox Exporter, White-box `/metrics`, **Node Exporter**, **cAdvisor** và Alertmanager |
| 2 | `BIT240230` | **Nguyễn Quang Trung** | **QA** | Thành viên Nhóm 02 | Xây dựng & vận hành kiểm thử tự động (64 Node tests, 16 smoke checks), kiểm thử tích hợp 3 vai trò qua Nginx Gateway, kiểm toán bảo mật (`npm audit` 0 lỗ hổng), nghiệm thu & tổng hợp minh chứng |
| 3 | `BIT240094` | **Phan Văn Hiếu** | **AI** | [@hieunofun](https://github.com/hieunofun) | Xây dựng `Dockerfile.ai` (non-root Gunicorn WSGI), triển khai dịch vụ AI (Chatbot FAQ RAG & chấm điểm CV song ngữ Việt–Anh), bảo mật cầu nối `X-JobLink-AI-Token` & kiểm thử AI cô lập mạng (`--network none`) |
| 4 | `BIT240115` | **Nguyễn Doãn Huy** | **Docker** | `Huyday` | Xây dựng `Dockerfile`, `docker-compose.yml`, Nginx Reverse Proxy Gateway (Gzip, rate-limiting, chặn `/metrics`), gia cố non-root containers, MySQL 8.0 `utf8mb4` & bảo toàn dữ liệu bằng Named Volumes |
| 5 | `BIT240131` | **Nguyễn Trần Tuấn Khôi** | **DevOps** | Thành viên Nhóm 02 | Quản trị hạ tầng server Linux, thiết lập pipeline tự động deploy qua SSH (`Jenkinsfile.ssh-deploy`), cơ chế Auto-Rollback nguyên tử (`scripts/ci-deploy.js`), Day-2 Migration & sao lưu/phục hồi kiểm chứng SHA-256 |
| 6 | `BIT240173` | **Trần Đức Nguyên** | **CI/CD** | [@Nguyen16112006](https://github.com/Nguyen16112006) (`DucNguyen`) | Quản trị GitHub & GitHub Actions CI, triển khai Jenkins Container hóa (IaC + Signed HMAC-SHA256 Webhook), xây dựng `Jenkinsfile` và cấu hình tích hợp phân tích mã tĩnh **SonarQube** (`sonar-project.properties`, Quality Gate) |

## Cách kiểm chứng trên Repository

- **Lịch sử Commits:** `git shortlog -sn --all`
- **GitHub Actions CI:** https://github.com/hieunofun/cong-nghe-phan-mem/actions
- **Issues & Pull Requests:** https://github.com/hieunofun/cong-nghe-phan-mem/pulls
