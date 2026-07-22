# Cấu hình Supabase cho JobLink

Hướng dẫn đầy đủ cho production miễn phí nằm tại [RENDER_FREE_DEPLOY.md](./RENDER_FREE_DEPLOY.md).

## Biến môi trường

Sử dụng Session pooler port `5432` cho Node/AI chạy lâu dài:

```env
DB_CLIENT=postgres
DATABASE_URL=postgresql://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxx
```

`SUPABASE_SECRET_KEY` chỉ được đặt trong backend. Không đưa key này vào `public/`, Git hoặc mã frontend.

## Khởi tạo production

```bash
npm run supabase:migrate
npm run supabase:storage
npm run admin:create
```

- `supabase:migrate` chạy toàn bộ file SQL trong `supabase/migrations/` theo thứ tự tên.
- `supabase:storage` tạo bucket public cho avatar/logo và bucket private cho CV.
- `admin:create` đọc `ADMIN_EMAIL` và `ADMIN_PASSWORD` từ environment.

Không chạy `npm run seed` trên production vì lệnh đó tạo tài khoản demo với mật khẩu công khai. Migration đã tạo sẵn danh mục ngành nghề và gói dịch vụ.
