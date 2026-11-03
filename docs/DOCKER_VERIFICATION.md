# Kiểm tra Docker JobLink — 30/10/2026

Kiểm tra lại khi mở máy: Docker Desktop bị E_ACCESSDENIED lúc WSL gắn đĩa dữ liệu
ở ổ E. Restart thông thường không khắc phục; mở Docker Desktop bằng quyền
Administrator đã khởi động được Engine 29.5.3. Images và volumes cũ được giữ nguyên.

## Đối chiếu đề bài

| Nội dung | Kết quả |
|---|---|
| Cài Docker Desktop | Đã có Desktop 4.78.0, Engine 29.5.3, Compose v5.1.4, WSL 2 / desktop-linux |
| Cài images liên quan | Đã pull mysql:8.0, node:22-alpine, python:3.11-slim |
| Build project | Đã build joblink-web:1.0 và joblink-ai:1.0 từ hai Dockerfile |
| Run | MySQL, AI và Web chạy healthy; Web tại http://localhost:3000 |
| Slides | JobLink_Docker_Presentation.pptx, 12 trang, đủ 4 nội dung; đã export và kiểm tra tràn văn bản |

## Các lỗi đã sửa

- docker-start.js chỉ require server.js nên Express không gọi listen; đã mở 0.0.0.0:3000.
- Lỗi seed không còn bị bỏ qua khi khởi động Docker.
- Base Node 20 không đáp ứng Supabase SDK yêu cầu Node >=22; đã đổi sang node:22-alpine.
- Thêm healthcheck SQL/HTTP và điều kiện Web đợi cả MySQL và AI healthy.
- MySQL init thiếu SET NAMES utf8mb4 khiến ngành nghề/gói dịch vụ lỗi dấu.
  Đã sửa schema và dữ liệu demo hiện tại; khôi phục category_id cho 4 tin mẫu.
  Đã chạy lại schema với client latin1 để xác nhận SET NAMES vẫn giữ đúng tiếng Việt.
- Sửa lệnh build, đường dẫn AI, tên service, tags, volumes và endpoint sai trên slides.
- Giới hạn các cổng publish ở localhost; .env và tài liệu/slides/cache được loại khỏi image.

## Kết quả xác minh

- node scripts/docker-check.js: **12/12 PASS**. Kiểm tra health, frontend config local,
  4 tin mẫu, tìm kiếm, danh mục tiếng Việt và lọc ngành, đăng nhập 3 vai trò,
  dashboard admin/company/candidate, AI health, chatbot lấy việc từ MySQL,
  CV matching, recommendation và CV analysis.
- Trình duyệt Edge qua Playwright: trang chủ render tin mẫu; đăng nhập ứng viên,
  doanh nghiệp và admin chuyển đúng dashboard; không có JavaScript exception hoặc API HTTP >=400.
- docker compose down rồi up -d --wait: **PASS**. DB giữ nguyên 4 tài khoản,
  4 tin tuyển dụng, 2 doanh nghiệp; marker trong volume uploads vẫn tồn tại.
  Marker kiểm tra đã được dọn; smoke checks tiếp tục đạt 12/12.
- Container Web dùng Node v22.23.4; không có /app/.env trong image.
- PowerPoint: 12 slides đã export thành PNG; kiểm tra BoundHeight không phát hiện tràn khung text.

Ảnh giao diện, ảnh slides và kết quả audit: artifacts/docker-demo/.
Hướng dẫn chạy lại và tài khoản: DOCKER_GUIDE.md.

## Giới hạn cần biết

- AI chạy lightweight: TF-IDF, CV analyzer, FAQ RAG (23 chunks), không có Groq key / Sentence Transformer.
- OAuth, SMTP và thanh toán thật chưa cấu hình trong bộ Compose này.
- npm audit còn 5 cảnh báo dependencies: 1 critical, 3 high, 1 moderate.
  Chưa thay dependencies ngoài phạm vi Docker; cấu hình này dành cho demo local.
- Bìa slides còn tên nhóm và giảng viên mẫu, cần thay thông tin thực tế.
