
> Demo giữa kỳ có Jenkins/CI/CD và giám sát: xem [MIDTERM_DEMO.md](MIDTERM_DEMO.md).
> Chạy toàn bộ bằng `node scripts/devops-demo.js up`; phần bên dưới vẫn dùng cho demo Docker cơ bản.

## 1. Cài Docker Desktop

Máy demo đã có Docker Desktop 4.78.0, Engine 29.5.3, Compose v5.1.4 và WSL 2.
Mở Docker Desktop, đợi Engine chạy, kiểm tra trong PowerShell:

~~~powershell
Set-Location E:\trienkhaiphanmemcki
docker version
docker compose version
docker info
~~~

Máy khác: bật ảo hóa, cài WSL 2 bằng wsl --install, cài
[Docker Desktop](https://www.docker.com/products/docker-desktop/), khởi động lại nếu được yêu cầu,
rồi chọn WSL 2 backend và Linux containers.

Trên máy demo, nếu Engine kẹt ở Starting và log báo
**Wsl/Service/AttachDisk/MountDisk/HCS/E_ACCESSDENIED** khi gắn đĩa Docker ở ổ E:
thoát Docker Desktop rồi mở lại bằng **Run as administrator**, xác nhận UAC.
Lần kiểm tra lại đã khởi động được Engine bằng cách này; giữ nguyên images và volumes.
Tham khảo [quyền gắn đĩa WSL của Microsoft](https://learn.microsoft.com/windows/wsl/wsl2-mount-disk).

## 2. Cài images liên quan

~~~powershell
docker pull mysql:8.0
docker pull node:22-alpine
docker pull python:3.11-slim
docker image ls
~~~

| Image | Vai trò |
|---|---|
| mysql:8.0 | Cơ sở dữ liệu MySQL, charset utf8mb4 |
| node:22-alpine | Base image cho Express và frontend HTML/CSS/JavaScript |
| python:3.11-slim | Base image cho Flask, scikit-learn, FAQ RAG |

Express và Flask được cài trong bước build từ package-lock.json và
ai_service/requirements.render.txt. Không cần image framework riêng.
Node 22 đáp ứng yêu cầu node >=22 của Supabase SDK đang có trong project.

## 3. Build project thành images

~~~powershell
docker compose build
docker image ls --filter "reference=joblink-*"
~~~

Hoặc build riêng từng image:

~~~powershell
docker build -t joblink-web:1.0 .
docker build -f Dockerfile.ai -t joblink-ai:1.0 .
~~~

Mở Docker Desktop > **Images** để trình bày joblink-web:1.0, joblink-ai:1.0 và mysql:8.0.
.dockerignore loại .env, node_modules, .git, slides và dữ liệu upload khỏi build context.

## 4. Run và kiểm tra

~~~powershell
docker compose up -d --wait --wait-timeout 180
docker compose ps
node scripts/docker-check.js
~~~

Nếu chưa build hoặc vừa sửa code:

~~~powershell
docker compose up -d --build --wait --wait-timeout 180
~~~

Ba container phải ở trạng thái **Up (healthy)**:

| Container | Truy cập trên máy demo | Kiểm tra sức khỏe |
|---|---|---|
| joblink-mysql | 127.0.0.1:3306 | Đăng nhập user ứng dụng, chạy SELECT 1 |
| joblink-ai | http://localhost:5000/health | HTTP /health |
| joblink-web | **http://localhost:3000** | HTTP /health |

Thứ tự: MySQL healthy → AI healthy → Web. Web chờ kết nối DB,
seed khi chưa có admin rồi mở HTTP server ở 0.0.0.0:3000 trong container.
Compose chỉ publish cổng ra 127.0.0.1 của máy demo.

MySQL chạy database/schema.sql **lần đầu khi volume trống**, tạo 12 bảng,
8 ngành nghề và 4 gói dịch vụ. Seed tạo 4 tài khoản, 2 doanh nghiệp,
4 tin tuyển dụng và 1 hồ sơ ứng viên.

node scripts/docker-check.js kiểm tra trang chủ, dữ liệu MySQL, tìm kiếm,
đăng nhập 3 vai trò, API dashboard, AI health, chatbot truy vấn việc làm,
CV matching, gợi ý việc làm và phân tích CV. Script chỉ đọc dữ liệu và đăng nhập.

### Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | admin@joblink.vn | Admin@123 |
| Doanh nghiệp | hr@vietsoft.vn | Company@123 |
| Doanh nghiệp 2 | tuyendung@greenmart.vn | Company@123 |
| Ứng viên | candidate@joblink.vn | Candidate@123 |
