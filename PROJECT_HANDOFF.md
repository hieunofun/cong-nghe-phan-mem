# JobLink - ghi chu ban giao

Cap nhat: 21/07/2026

## Trang thai hien tai

- Web Node.js dang chay tai `http://localhost:3000`.
- AI Flask dang chay tai `http://localhost:5000`.
- Moi truong local dung MySQL; du an da co adapter PostgreSQL de chuyen sang Supabase.
- Khong dua `.env` hoac khoa API len Git. Tai khoan mau nam trong `database/seed.js`.

## Nhung phan da hoan thanh trong cuoc tro chuyen

### Dieu huong va tai khoan

- Nut Quay lai dung lich su trinh duyet, kem URL du phong khi mo trang truc tiep.
- Da ra soat cac trang dang nhap, dang ky, quen mat khau, viec lam, chi tiet tin, bang gia va Kho CV.
- Them trang giai phap rieng cho doanh nghiep thay vi dua thang vao dang nhap/dang ky.
- Header thay doi theo vai tro. Doanh nghiep co `Trang quan ly`, `Trang chu`, `Giai phap tuyen dung`, `Bang gia`, `Ho tro`.
- Lien ket `Kho CV ung vien` trong sidebar da duoc tach khoi listener chuyen tab, nen mo dung `/cv-search.html` thay vi lam trang dashboard bi trang.
- Khi nguoi dang dang nhap bam Dang nhap/Dang ky tai khoan khac, he thong xac nhan va dang xuat tai khoan hien tai truoc.

### Khu vuc doanh nghiep

- Dashboard co Tong quan, Tin tuyen dung, Quan ly ung vien, Goi cua toi, Kho CV va Ho so cong ty.
- Dinh dang luong VND co dau tach hang nghin, gioi han/kiem tra min-max va luu gia tri so sach vao database.
- Goi dich vu, lich su thanh toan, quota tin/VIP/Kho CV va trang bang gia da duoc noi vao backend.
- Nut cua goi Mien phi dung nhan `Xem va chon goi`; tai khoan da co goi dung nhan `Nang cap goi`.
- Footer, dieu huong bang gia va nut mua goi da duoc chinh lai de khong mat ngu canh doanh nghiep.
- Quy trinh ung vien co chuyen trang thai hop le, ly do bat buoc khi tu choi, xac nhan khi mo lai va lich su xu ly.
- Lich su xu ly nam o phia Doanh nghiep: `Quan ly ung vien` -> `Lich su`. Ung vien chi thay trang thai va phan hoi hien tai.
- Ten ung vien uu tien `full_name`, neu du lieu cu bi trong thi hien email; dong bo CV khong con xoa ten/so dien thoai.

### Bang gia moi nhat

- Gia rut gon dung dinh dang Viet Nam: `1,5 trieu`, `3,5 trieu`; goi Mien phi hien `0 d/thang`.
- Quyen loi duoc sap cung thu tu va can theo hang de de so sanh; noi dung khong con hien cac quota `0 CV/thang` may moc.
- CTA dung ten goi (`Chon Basic`, `Chon Pro`, `Chon Enterprise`) va nhan dien goi hien tai cua doanh nghiep qua API subscription.
- Basic co quyen tim Kho CV va 10 luot xem CV/thang. Tai khoan Mien phi van khong co quyen Kho CV va tiep tuc nhan HTTP 403 dung logic.
- Bo cuc bang gia da co breakpoint 2 cot va 1 cot cho tablet/mobile.

### Checkout chuyen khoan/VietQR moi nhat

- Da bo Thanh toan Demo va MoMo gia khoi checkout. Backend chi chap nhan `bank_transfer`; gui `demo` hoac `momo` tra HTTP 400.
- Dung tai khoan Vietcombank duoc cau hinh trong `config/payment.js` va `.env.example`.
- Sau khi dong y dieu khoan, backend tao don co ma rieng, het han sau 24 gio va tra Quick Link VietQR chua dung so tien + noi dung `JOBLINK <ma don>`.
- Neu gui lap lai cung goi khi don cu con hieu luc, backend tra lai don cu thay vi tao giao dich trung.
- Don chi duoc kich hoat sau khi Admin xac nhan. Xu ly dong thoi khong the kich hoat mot giao dich hai lan.
- Luu bang chung chap thuan tai payment: thoi diem, phien ban dieu khoan/bao mat, IP va user agent.
- Checkout gom hai buoc: kiem tra don + dong y dieu khoan, sau do hien QR, thong tin chuyen khoan va nut sao chep.
- Co the mo lai don tu `Goi cua toi` -> `Lich su giao dich` -> `Xem don`; trang thai duoc polling khi modal dang mo.
- Them `public/payment-policy.html`; cap nhat `terms.html` va `privacy.html` len phien ban `2026-07-21`.

### Khu vuc ung vien

- Header va dashboard ung vien co dieu huong ro rang, tim kiem viec lam va quay lai khu vuc quan ly.
- Don da ung tuyen co thong ke, the chi tiet, trang thai, phan hoi, `Viec tuong tu` va `Xem tin`.
- Tin da luu nam tren cung; ben duoi la Kham pha viec lam. Tin da ung tuyen khong con nam trong Tin da luu.
- Khi ung tuyen thanh cong, backend tu dong bo tin khoi danh sach da luu.
- Tin da dong/xoa khong mo lai noi dung cu; giao dien thong bao tin khong con va goi y viec tuong tu.
- Them muc Tim kiem viec lam trong dashboard va danh sach goi y loai tru tin da luu/da ung tuyen khi can.

## Nang cap Quan ly ung vien moi nhat

- API `GET /api/applications/job/:jobId` ho tro `search`, `skill`, `status`, `sort`, `page`, `limit`.
- Mac dinh 20 ho so/trang, gioi han toi da 100; truy van phan trang thuc hien tai database.
- Tim theo ten, email hoac so dien thoai; loc ky nang; sap xep moi nhat, cu nhat hoac diem AI cao nhat.
- Cac tab giai doan hien so luong va chi tai ho so cua giai doan dang chon; co tab Tat ca.
- Danh sach hai cot tren desktop, mot cot tren mobile; co trang thai rong theo tung bo loc.
- Phan tich AI tinh diem CV so voi chinh tin tuyen dung, luu `ai_score`, `ai_label`, `ai_analyzed_at`.
- Diem AI da kiem thu tren don hien co va co the sap xep lai qua `sort=ai_desc`.

## Database va file quan trong

- Workflow: `database/application_workflow.sql` va `supabase/migrations/20260721160000_application_workflow.sql`.
- Phan trang/AI: `database/applicant_management.sql` va `supabase/migrations/20260721170000_applicant_management.sql`.
- Bang gia/Basic Kho CV: `database/pricing_packages.sql` va `supabase/migrations/20260721180000_pricing_packages.sql`.
- Checkout/VietQR/dieu khoan: `database/payment_checkout.sql` va `supabase/migrations/20260721190000_payment_checkout.sql`.
- Schema MySQL goc da cap nhat tai `database/schema.sql`.
- Backend chinh: `models/applicationModel.js`, `controllers/applicationController.js`, `controllers/aiController.js`.
- Giao dien chinh: `public/company-dashboard.html`, `public/js/company-dashboard.js`.
- Adapter MySQL/PostgreSQL: `config/db.js`.

## Kiem thu da chay

- `node --check` dat cho model, controller va JavaScript dashboard.
- API loc trang thai sai tra HTTP 400; `limit=999` bi gioi han ve 100.
- Tim email/so dien thoai/ky nang, dem giai doan va sap xep AI da dat.
- Bai test 25 ung vien tam: trang 1 = 20, trang 2 = 5, loc React = 12, tu choi = 5, AI cao nhat dung; du lieu tam da xoa sach.
- AI da tinh va luu diem thuc vao MySQL. Log Node khong co loi.
- API packages da tra Basic voi `can_search_cv = 1`, `max_cv_views = 10`; render gia, quyen loi va trang thai CTA da dat.
- Checkout test dat: Demo/khong dong y/sai phien ban deu bi chan; tao don, tai QR PNG, luu audit, chong tao trung va xem lai don deu dung.
- Admin approval test dat: payment chuyen `completed`, tao dung mot subscription va lan approve thu hai bi chan; du lieu test da xoa.
- `npm run test:checkout-render` dat cho render bang gia, checkbox dieu khoan, payload bank transfer va QR.
- Trinh duyet tich hop khong kha dung trong phien nay, nen chua chup anh kiem tra truc quan desktop/mobile.

## Khi dua len Render/Supabase

- Docker khong bat buoc. Nen tach thanh mot Render Web Service Node va mot Render Web Service Python/AI.
- Chay toan bo migration Supabase, sau do dat `DATABASE_URL`, `DB_CLIENT=postgres` va `AI_SERVICE_URL` tren Render.
- Node dung `npm start`. AI production nen dung WSGI server thay cho Flask development server.
- Vercel don le khong phu hop voi backend Node + AI Flask dang chay lau; co the dung Vercel cho frontend neu tach kien truc.

## Viec nen lam tiep

- Mo `company-dashboard.html?view=applicants` va kiem tra truc quan o desktop/mobile.
- Neu du lieu rat lon, toi uu tim kiem bang full-text/trigram va dua counts vao cache.
- Bo sung test tu dong cho PostgreSQL/Supabase va quy trinh deploy Render.
