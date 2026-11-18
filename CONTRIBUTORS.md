# Contributors — Nhóm 02 (Lớp 24IT3 · Trường Đại học CMC)

**Học phần:** Triển khai phần mềm (INFO3004)  
**Giảng viên hướng dẫn:** Đặng Quốc Hữu  
**Đề tài:** Xây dựng nền tảng tuyển dụng JobLink tích hợp Trí tuệ nhân tạo

| TT | MSSV | Họ và Tên | Tài khoản Git / GitHub | Phạm vi đóng góp chính |
|---:|---|---|---|---|
| 1 | `BIT240094` | **Phan Văn Hiếu** | [@hieunofun](https://github.com/hieunofun) | Kiến trúc Backend/AI, chuẩn hóa cấu hình `NODE_ENV=production`, kết nối DB đa môi trường, GitHub Actions CI & bộ 64 kịch bản kiểm thử tự động |
| 2 | `BIT240115` | **Nguyễn Doãn Huy** | `Huyday` | Đóng gói Docker (`Dockerfile`, `Dockerfile.ai`, Nginx Gateway), `Jenkinsfile` 8 giai đoạn, bộ nhận GitHub Webhook HMAC-SHA256, tự động Rollback & điều phối demo |
| 3 | `BIT240131` | **Nguyễn Trần Tuấn Khôi** | Thành viên Nhóm 02 | Hệ thống giám sát Prometheus, Blackbox Exporter, bộ thu thập chỉ số nội tại White-box `/metrics`, Alertmanager & diễn tập khôi phục sự cố |
| 4 | `BIT240173` | **Trần Đức Nguyên** | [@Nguyen16112006](https://github.com/Nguyen16112006) (`DucNguyen`) | Cấu hình MySQL 8.0 container (`utf8mb4`), 6 Named Volumes bảo toàn dữ liệu, migration idempotent & công cụ sao lưu/phục hồi kiểm chứng SHA-256 |
| 5 | `BIT240014` | **Niê Phương Anh** | [@Phuonganh149](https://github.com/Phuonganh149) | Thiết kế Provisioning-as-Code cho Grafana Dashboard (13 panels), kiểm thử luồng nghiệp vụ 3 vai trò qua Nginx Gateway & biên soạn slide, báo cáo |
| 6 | `BIT240230` | **Nguyễn Quang Trung** | Thành viên Nhóm 02 | Kiểm toán bảo mật thư viện (`npm audit` 0 lỗ hổng), non-root containers, tường lửa Nginx rate-limiting, 16 kịch bản smoke checks & thiết kế mở rộng SSH/SonarQube |

## Cách kiểm chứng trên Repository

- **Lịch sử Commits:** `git shortlog -sn --all`
- **GitHub Actions CI:** https://github.com/hieunofun/cong-nghe-phan-mem/actions
- **Issues & Pull Requests:** https://github.com/hieunofun/cong-nghe-phan-mem/pulls
