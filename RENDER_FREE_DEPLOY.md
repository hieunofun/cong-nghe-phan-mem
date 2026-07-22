# Trien khai JobLink that tren ha tang mien phi

Kien truc production-free cua du an:

- `joblink-web`: Node/Express tren Render Free.
- `joblink-ai`: Flask/Gunicorn tren Render Free, dung TF-IDF + CV analyzer + Groq RAG.
- Supabase Free: PostgreSQL va Storage.
- CV nam trong bucket private; backend chi tra signed URL co thoi han.
- Avatar/logo nam trong bucket public.

Ban Render Free khong tai `model.safetensors` 1 GB. Matching van la tinh nang that, nhung dung TF-IDF/skill coverage thay vi Sentence Transformer de nam trong gioi han 512 MB RAM.

## 1. Tao Supabase project

Tao project, chon region gan nguoi dung va luu database password. Trong nut **Connect**, lay chuoi **Session pooler** port `5432`, co dang:

```text
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require
```

Trong **Settings > API Keys**, tao/copy `Secret key` (`sb_secret_...`). Key nay chi duoc dat o Node backend, khong bao gio dua vao `public/`.

## 2. Khoi tao database, storage va admin production

Chay PowerShell tai thu muc du an:

```powershell
$env:DB_CLIENT="postgres"
$env:DATABASE_URL="<SUPABASE_SESSION_POOLER_URL>"
$env:SUPABASE_URL="https://<PROJECT_REF>.supabase.co"
$env:SUPABASE_SECRET_KEY="<SUPABASE_SECRET_KEY>"

npm run supabase:migrate
npm run supabase:storage

$env:ADMIN_EMAIL="admin@your-domain.com"
$env:ADMIN_PASSWORD="<MAT_KHAU_RIENG_MANH>"
npm run admin:create

Remove-Item Env:ADMIN_EMAIL,Env:ADMIN_PASSWORD,Env:SUPABASE_SECRET_KEY,Env:SUPABASE_URL,Env:DATABASE_URL,Env:DB_CLIENT
```

Mat khau admin phai co it nhat 12 ky tu, co chu hoa, chu thuong, so va ky tu dac biet.

Khong chay `npm run seed` tren production vi script do tao cac tai khoan demo co mat khau cong khai. Migration da tu tao danh muc nganh nghe va cac goi dich vu.

## 3. Day source len GitHub

File `.env`, upload local va model 1 GB da duoc `.gitignore` loai bo.

```bash
git init
git add .
git commit -m "Prepare JobLink production free deployment"
git branch -M main
git remote add origin <GITHUB_REPOSITORY_URL>
git push -u origin main
```

Nen dung GitHub repository private.

## 4. Tao Render Blueprint

Trong Render:

1. Chon **New > Blueprint**.
2. Ket noi repository GitHub.
3. Render doc `render.yaml` va tao hai Web Service Free.
4. Dien cac bien duoc hoi:
   - `DATABASE_URL`: Session pooler URL cua Supabase.
   - `GROQ_API_KEY`: key cua Groq.
   - `SUPABASE_URL`: URL project Supabase.
   - `SUPABASE_SECRET_KEY`: secret key cua Supabase.

`JWT_SECRET`, `SESSION_SECRET` va `AI_SERVICE_TOKEN` duoc Render tu sinh. URL public cua AI cung duoc Blueprint noi tu dong sang Node.

## 5. Cau hinh email va thanh toan

Quen mat khau production can SMTP:

Them cac bien sau vao Environment cua service `joblink-web`:

```text
SMTP_HOST
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER
SMTP_PASSWORD
MAIL_FROM
```

Checkout chuyen khoan can:

Them cac bien sau vao Environment cua service `joblink-web`:

```text
PAYMENT_BANK_ID
PAYMENT_BANK_NAME
PAYMENT_ACCOUNT_NUMBER
PAYMENT_ACCOUNT_NAME
PAYMENT_BANK_BRANCH
PAYMENT_QR_TEMPLATE=compact2
```

Neu chua cau hinh ngan hang, backend se khoa tao giao dich thay vi dung thong tin hard-code.

## 6. Cau hinh OAuth (tuy chon)

Them credential vao `joblink-web`, sau do dat callback URL:

```text
https://<WEB_HOST>/api/auth/google/callback
https://<WEB_HOST>/api/auth/github/callback
https://<WEB_HOST>/api/auth/facebook/callback
```

`BASE_URL` khong bat buoc tren Render vi backend tu doc `RENDER_EXTERNAL_HOSTNAME`.

## 7. Kiem tra sau deploy

```text
https://<WEB_HOST>/health
https://<WEB_HOST>/api/categories
https://<WEB_HOST>/api/jobs/featured
https://<AI_HOST>/health
```

Sau do kiem tra dang ky, dang nhap, upload avatar, upload CV, ung tuyen va chatbot.

## Gioi han cua phuong an mien phi

- Render Free ngu sau khi khong co traffic; request dau co the cham. Node cho AI toi da 120 giay khoi dong.
- Hai service cung su dung quy gio Free cua workspace.
- Supabase va Groq co quota Free; can theo doi Dashboard de khong vuot quota.
- Khong co Sentence Transformer 1 GB. Muon dung model nay phai chuyen sang dich vu co RAM lon hon hoac model API mien phi khac.
