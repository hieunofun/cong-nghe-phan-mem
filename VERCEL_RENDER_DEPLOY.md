# Triển khai JobLink: Backend Vercel, Frontend và AI Render

Kiến trúc production:

- `joblink-frontend`: Render Static Site, phát hành thư mục `public/`.
- Node.js/Express API: một Vercel Function chạy tại `https://<VERCEL_PROJECT>.vercel.app`.
- `joblink-ai`: Render Python Web Service.
- Supabase: PostgreSQL và Storage.

Không đưa `.env`, Supabase secret, Groq key hoặc mật khẩu database vào Git.

## 1. Đẩy source lên GitHub

Vercel và Render cùng kết nối tới repository này. Kiểm tra `.env` vẫn được Git bỏ qua trước khi push:

```bash
git check-ignore .env
git add .
git commit -m "Configure Vercel backend and Render frontend"
git push
```

## 2. Tạo AI và frontend trên Render

1. Chọn **New > Blueprint** và kết nối repository.
2. Render đọc `render.yaml` để tạo:
   - Python Web Service `joblink-ai`.
   - Static Site `joblink-frontend`.
3. Nhập `DATABASE_URL` và `GROQ_API_KEY` cho AI.
4. Tạm đặt `FRONTEND_API_BASE_URL=https://placeholder.invalid` cho Static Site.
5. Lưu URL thật của `joblink-ai` và `joblink-frontend`.
6. Trong Environment Group `joblink-ai-shared`, lấy giá trị `AI_SERVICE_TOKEN` để đặt cùng giá trị đó trên Vercel.

Render Static Site chạy `npm ci && npm run build:frontend`. Script build chỉ ghi URL công khai của backend vào `public/js/env.js`; không đặt secret vào biến này.

## 3. Tạo backend trên Vercel

Import cùng repository vào Vercel. Vercel tự nhận diện Express từ `server.js`; `vercel.json` đặt Function tại Mumbai (`bom1`) gần Supabase `ap-south-1` và chạy migration khi build.

Đặt các Environment Variables cho cả Production và Preview nếu cần:

```text
NODE_ENV=production
DB_CLIENT=postgres
DATABASE_URL=<Supabase transaction pooler port 6543>
BASE_URL=https://<VERCEL_PROJECT>.vercel.app
FRONTEND_URL=https://<RENDER_FRONTEND>.onrender.com
JWT_SECRET=<chuỗi ngẫu nhiên mạnh>
JWT_EXPIRES_IN=7d
SESSION_SECRET=<chuỗi ngẫu nhiên khác>
SUPABASE_URL=https://<PROJECT_REF>.supabase.co
SUPABASE_SECRET_KEY=<sb_secret_...>
SUPABASE_PUBLIC_BUCKET=joblink-public
SUPABASE_CV_BUCKET=joblink-cv
AI_SERVICE_URL=https://<RENDER_AI>.onrender.com
AI_SERVICE_TOKEN=<giống hệt token của joblink-ai trên Render>
AI_TIMEOUT_MS=120000
AI_RETRY_DELAYS_MS=2000,5000,10000,15000,30000
```

`DATABASE_URL` của Vercel nên dùng transaction pooler port `6543`; không dùng direct connection vì Function có thể mở nhiều phiên đồng thời.

Các biến tùy chọn đặt trên Vercel nếu sử dụng:

```text
CORS_ORIGINS=https://ten-mien-phu.example
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
MAIL_FROM
PAYMENT_BANK_ID
PAYMENT_BANK_NAME
PAYMENT_ACCOUNT_NUMBER
PAYMENT_ACCOUNT_NAME
PAYMENT_BANK_BRANCH
PAYMENT_QR_TEMPLATE
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
FACEBOOK_APP_ID
FACEBOOK_APP_SECRET
```

Sau khi deploy, kiểm tra:

```text
https://<VERCEL_PROJECT>.vercel.app/health
https://<VERCEL_PROJECT>.vercel.app/api/categories
https://<VERCEL_PROJECT>.vercel.app/api/jobs/featured
```

## 4. Nối frontend Render với backend Vercel

Trong Static Site `joblink-frontend`, đổi:

```text
FRONTEND_API_BASE_URL=https://<VERCEL_PROJECT>.vercel.app
```

Không thêm `/api` ở cuối. Sau đó chọn **Manual Deploy > Deploy latest commit** để Render build lại `public/js/env.js`.

Nếu URL frontend thực tế khác giá trị đã dự kiến, cập nhật lại `FRONTEND_URL` trên Vercel và redeploy backend.

## 5. OAuth và đặt lại mật khẩu

OAuth callback luôn đi vào backend Vercel:

```text
https://<VERCEL_PROJECT>.vercel.app/api/auth/google/callback
https://<VERCEL_PROJECT>.vercel.app/api/auth/github/callback
https://<VERCEL_PROJECT>.vercel.app/api/auth/facebook/callback
```

Homepage/website URL của OAuth đặt thành URL frontend Render. Sau khi đăng nhập, backend tự chuyển người dùng về frontend.

Email đặt lại mật khẩu cũng tạo liên kết frontend Render thông qua `FRONTEND_URL`.

## 6. Kiểm tra cuối

1. Mở frontend Render và kiểm tra danh sách việc làm.
2. Đăng ký, đăng nhập và tải lại trang để kiểm tra JWT.
3. Upload avatar và CV PDF/DOCX tối đa 4 MB.
4. Ứng tuyển và xem lịch sử trạng thái.
5. Mở chatbot, yêu cầu đề xuất việc và bấm URL công việc.
6. Kiểm tra AI chấm CV tiếng Việt và tiếng Anh.

Vercel Functions giới hạn request/response ở 4,5 MB, vì vậy JobLink giới hạn CV ở 4 MB để chừa phần dung lượng cho multipart metadata.
