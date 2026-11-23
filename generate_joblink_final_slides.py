"""Editable Final Defense PowerPoint (INFO3004), based on the CMC template, without speaker notes."""
from pathlib import Path
import argparse
import json
import re
import sys

shared_packages = Path('E:/site-packages')
if shared_packages.is_dir():
    sys.path.insert(0, str(shared_packages))

from PIL import Image
from pptx import Presentation
from pptx.util import Inches
import generate_joblink_slides as d

ROOT = Path(__file__).resolve().parent
FINAL_EVIDENCE = ROOT / 'artifacts' / 'final-demo'
MIDTERM_EVIDENCE = ROOT / 'artifacts' / 'midterm-demo'
DEFENSE_EVIDENCE = ROOT / 'artifacts' / 'defense-2026-11-23'
PUBLIC_URL = 'http://136.110.25.226'
TOTAL = 24
d.TOTAL = TOTAL


def takeaway(slide, value, color=d.NAVY):
    d.text(slide, value, 0.85, 6.14, 11.65, 0.72, size=18, color=color,
           bold=True, name='Main takeaway')


def card(slide, x, y, w, h, title, detail, size=19, title_size=22):
    d.panel(slide, x, y, w, h)
    d.text(slide, title, x + .22, y + .16, w - .44, .62,
           size=title_size, color=d.BLUE, bold=True)
    d.text(slide, detail, x + .22, y + .82, w - .44, h - .92, size=size)


def picture(slide, filename, x, y, w, h):
    file = DEFENSE_EVIDENCE / filename
    if not file.exists():
        file = FINAL_EVIDENCE / filename
    if not file.exists():
        file = MIDTERM_EVIDENCE / filename
    if not file.exists():
        raise FileNotFoundError(f'Missing evidence image: {filename}')
    with Image.open(file) as im:
        iw, ih = im.size
    scale = min(w / iw, h / ih)
    pw, ph = iw * scale, ih * scale
    slide.shapes.add_picture(
        str(file),
        Inches(x + (w - pw) / 2),
        Inches(y + (h - ph) / 2),
        width=Inches(pw),
        height=Inches(ph)
    )


def create(date, group='Nhóm 02 · Lớp 24IT3', lecturer='Đặng Quốc Hữu'):
    evidence = json.loads((FINAL_EVIDENCE / 'verification.json').read_text(encoding='utf-8'))
    vps_monitoring = DEFENSE_EVIDENCE / 'vps-monitoring.log'
    if vps_monitoring.exists():
        checked = re.search(r'(\d+)/\1 full-stack monitoring checks passed', vps_monitoring.read_text(encoding='utf-8'))
        if checked:
            evidence['monitoringChecks'] = int(checked[1])
    prs = Presentation(ROOT / 'Slides Template.pptx')
    for _ in range(len(prs.slides)):
        rel = prs.slides._sldIdLst[0].rId
        prs.part.drop_rel(rel)
        del prs.slides._sldIdLst[0]

    # 1 — Cover
    s = prs.slides.add_slide(prs.slide_masters[0].slide_layouts[0])
    d.remove_placeholders(s)
    d.text(s, 'BÁO CÁO ĐỒ ÁN CUỐI KỲ · INFO3004', 5.72, 1.72, 6.75, .45,
           size=18, color=d.WHITE, bold=True)
    d.text(s, 'JobLink\nTriển khai phần mềm', 5.69, 2.32, 6.9, 1.62,
           size=35, color=d.WHITE, bold=True, name='Slide title')
    d.text(s, 'Git · Jenkins · Docker · Nginx · Observability', 5.72, 4.15, 6.75, .52,
           size=20, color=d.WHITE)
    info = [
        f'Thực hiện: {group}',
        'Hiếu · Huy · Khôi · Nguyên · Phương Anh · Trung',
        f'Giảng viên hướng dẫn: {lecturer}' if lecturer else '',
        f'Hà Nội, tháng 11/2026 ({date})'
    ]
    d.text(s, '\n'.join([line for line in info if line]), 5.72, 4.92, 6.85, 1.85, size=15.5, color=d.WHITE)

    # 2 — Six pillars
    s = d.body(prs, 'Cấu trúc đồ án cuối kỳ', 'LỘ TRÌNH / 6 TRỤ CỘT')
    for i, (title, detail) in enumerate([
        ('Bài toán', '3 vai trò\n& AI CV'),
        ('Kiến trúc', 'Nginx + Web\n+ AI + MySQL'),
        ('CI / CD', 'GitHub Actions\n& Jenkins SSH'),
        ('DevSecOps', 'Non-root, Prod\n& 0 lỗ hổng'),
        ('Giám sát', 'Ứng dụng, Host,\nContainers & Alert'),
        ('Vận hành', 'DB Migrate\n& Backup SHA')
    ]):
        x = .72 + i * 1.98
        d.panel(s, x, 2.0, 1.84, 3.55)
        d.text(s, f'0{i+1}', x + .14, 2.22, 1.56, .75, size=36, color=d.BLUE, bold=True)
        d.text(s, title, x + .14, 3.25, 1.56, .62, size=17, color=d.NAVY, bold=True)
        d.text(s, detail, x + .14, 4.02, 1.56, 1.25, size=15, color=d.MUTED)
    takeaway(s, 'Quy trình khép kín: Mã nguồn → CI/CD → Container Production → Giám sát → Vận hành.')

    # 3 — Problem & objective
    s = d.body(prs, 'Bài toán tuyển dụng nhân sự thông minh', '01 / TỔNG QUAN SẢN PHẨM')
    card(s, .8, 1.95, 5.6, 3.65, 'Nhu cầu thực tế',
         'Ứng viên cần tìm việc và đối chiếu CV nhanh.\nDoanh nghiệp cần lọc hàng trăm hồ sơ hiệu quả.\nQuản trị viên cần kiểm duyệt tin đăng minh bạch.', size=20)
    card(s, 6.9, 1.95, 5.6, 3.65, 'Giải pháp JobLink',
         'Tích hợp AI chấm điểm CV song ngữ Việt – Anh.\nChatbot tư vấn việc làm trực tiếp từ cơ sở dữ liệu.\nĐóng gói đồng nhất, triển khai tự động hóa 100%.', size=20)
    takeaway(s, 'Sản phẩm thực tế có chiều sâu nghiệp vụ để kiểm chứng quy trình triển khai.')

    # 4 — Three roles
    s = d.body(prs, 'Ba vai trò nghiệp vụ trên nền tảng', '01 / LUỒNG NGƯỜI DÙNG')
    for x, title, detail in [
        (.8, 'Ứng viên', 'Tìm & lọc việc phân trang\nUpload CV PDF/DOCX Unicode\nTự động ứng tuyển theo điểm AI\nTheo dõi lịch sử trạng thái đơn'),
        (4.83, 'Doanh nghiệp', 'Đăng & quản lý tin tuyển dụng\nQuản lý gói VIP & VietQR\nTìm kiếm kho CV ứng viên\nXếp hạng ứng viên bằng AI'),
        (8.86, 'Quản trị viên', 'Duyệt hồ sơ doanh nghiệp\nDuyệt thanh toán nâng cấp gói\nKhóa/mở khóa tài khoản\nThống kê toàn hệ thống')
    ]:
        card(s, x, 1.95, 3.65, 3.85, title, detail, size=18)
    takeaway(s, 'Mọi vai trò đều được kiểm tra tự động ở bước Smoke Checks sau mỗi lần deploy.')

    # 5 — Production container architecture
    s = d.body(prs, 'Kiến trúc triển khai Production 4 tầng', '02 / KIẾN TRÚC ỨNG DỤNG')
    card(s, .7, 2.75, 2.35, 1.9, 'Gateway', 'Nginx :8088\nRate-limit · Gzip', size=16, title_size=20)
    card(s, 3.65, 2.75, 3.15, 1.9, 'Web / Express', 'Node 22 · Prod\nNon-root :3000', size=16, title_size=20)
    card(s, 7.55, 1.8, 4.95, 1.7, 'AI / Gunicorn WSGI', 'Python 3.11 · 4 threads · Token Auth', size=17, title_size=20)
    card(s, 7.55, 3.95, 4.95, 1.7, 'MySQL 8.0', 'utf8mb4 · Volumes · Auto-Migrate', size=17, title_size=20)
    d.arrow(s, 3.07, 3.7, 3.62, 3.7)
    d.arrow(s, 6.82, 3.35, 7.52, 2.65, elbow=True)
    d.arrow(s, 6.82, 4.05, 7.52, 4.8, elbow=True)
    d.arrow(s, 10.0, 3.52, 10.0, 3.92)
    takeaway(s, 'Truy cập bên ngoài đi qua Nginx Gateway; các container giao tiếp nội bộ an toàn.')

    # 6 — Public application and monitoring stack
    s = d.body(prs, '10 container trên VPS Google Cloud', '02 / CÔNG NGHỆ TRIỂN KHAI')
    for i, (title, detail) in enumerate([
        ('Nginx 1.27', 'Reverse Proxy · Tường lửa route'),
        ('Node.js 22 Alpine', 'Express Production · /metrics'),
        ('Python 3.11 Slim', 'Gunicorn WSGI · CV/RAG AI'),
        ('MySQL 8.0', 'InnoDB utf8mb4 · Backup SHA'),
        ('Giám sát ứng dụng', 'Prometheus · Blackbox · Grafana · Alertmanager'),
        ('Giám sát hạ tầng', 'Node Exporter · cAdvisor')
    ]):
        x, y = .8 + (i % 3) * 4.03, 1.9 + (i // 3) * 1.98
        card(s, x, y, 3.65, 1.78, title, detail, size=16, title_size=20)
    takeaway(s, 'VPS chạy 4 dịch vụ ứng dụng và 6 dịch vụ giám sát. Jenkins chạy trên máy điều phối.')

    # 7 — SCM & Two-tier CI
    s = d.body(prs, 'Quản lý mã nguồn & CI hai tầng', '03 / SCM & GITHUB ACTIONS')
    card(s, .8, 1.95, 5.6, 3.7, 'GitHub Actions CI',
         'Chạy trên mọi Push & Pull Request:\n• 64 Node tests + npm audit (0 lỗ hổng)\n• 3 Python AI multilingual tests\n• Build Docker non-root & promtool test', size=18)
    card(s, 6.9, 1.95, 5.6, 3.7, 'Signed GitHub Webhook',
         'Push nhánh main kích hoạt tức thì:\n• Xác thực chữ ký HMAC-SHA256\n• Chống gửi trùng delivery / SHA\n• Không lộ cổng quản trị Jenkins ra ngoài', size=18)
    takeaway(s, 'Đảm bảo mã nguồn đạt chuẩn kiểm thử và bảo mật trước khi đưa vào môi trường chạy.')

    # 8 — Jenkins stages and quality checks
    s = d.body(prs, 'Pipeline Jenkins và cổng chất lượng', '03 / JENKINS CI/CD')
    for i, (title, detail) in enumerate([
        ('1. Source', 'Checkout đúng SHA'),
        ('2. Node tests', '64 tests + JUnit'),
        ('3. Sec audit', 'Audit + Promtool'),
        ('4. Build', 'Web · AI · Gateway'),
        ('5. AI & UID', 'Test cô lập + UID!=0'),
        ('6. Registry', 'Push image tùy chọn'),
        ('7. Deploy', 'Migrate + Rollout'),
        ('8. Smoke', '16 luồng thực tế')
    ]):
        x, y = .75 + (i % 4) * 2.98, 1.92 + (i // 4) * 1.98
        card(s, x, y, 2.75, 1.75, title, detail, size=16, title_size=19)
    takeaway(s, 'Có thể bật SonarQube Quality Gate sau bước kiểm toán, trước khi build image.')

    # 9 — Auto-rollback mechanism
    s = d.body(prs, 'Cơ chế Tự động Rollback khi triển khai lỗi', '03 / AN TOÀN PHÁT HÀNH')
    card(s, .8, 1.95, 5.6, 3.65, 'Trước khi cập nhật',
         'ci-deploy.js lưu lại bộ 3 image tags\nổn định hiện hành (web, ai, gateway)\nvào .ci/deployment.json trước khi\nthay thế bất kỳ container nào.', size=19)
    card(s, 6.9, 1.95, 5.6, 3.65, 'Khi kiểm tra sau deploy lỗi',
         'Pipeline SSH gọi rollback ngay trên VPS,\nkhôi phục 3 image trước đó, giữ MySQL\nvà dữ liệu upload. Trạng thái được\nghi vào deployment.json.', size=19)
    takeaway(s, 'Chỉ xác nhận deploy sau khi smoke test và kiểm tra URL công khai đều đạt.')

    # 10 — Real Jenkins visual
    s = d.body(prs, 'Bằng chứng thực thi Pipeline trên Jenkins', '03 / KẾT QUẢ CI/CD')
    if (DEFENSE_EVIDENCE / 'jenkins-ssh-success.png').exists():
        picture(s, 'jenkins-ssh-success.png', .8, 1.65, 11.7, 4.35)
        takeaway(s, 'Job joblink-ssh-deploy · Registry, SSH, smoke test và kiểm tra URL công khai.')
    else:
        picture(s, 'jenkins-pipeline.png', .8, 1.65, 11.7, 4.35)
        takeaway(s, 'Bản dựng joblink-scm #8 · Pipeline triển khai cục bộ.')

    # 11 — Hardened Dockerfiles
    s = d.body(prs, 'Đóng gói Container chuẩn Production', '04 / HARDENED DOCKERFILES')
    d.text(s, 'Web · Dockerfile', .85, 1.68, 5.6, .5, size=22, color=d.BLUE, bold=True)
    d.text(s, 'AI · Dockerfile.ai', 6.95, 1.68, 5.6, .5, size=22, color=d.BLUE, bold=True)
    d.command(s, 'FROM node:22-alpine\nRUN npm ci --omit=dev\nENV NODE_ENV=production \\\n    STORAGE_DRIVER=local\nUSER node\nCMD ["node",\n "scripts/docker-start.js"]', .8, 2.3, 5.6, 3.35, size=17)
    d.command(s, 'FROM python:3.11-slim\nRUN useradd -r -u 1001 appuser\nUSER appuser\nCMD ["gunicorn", "--chdir",\n "ai_service", "app:app",\n "--workers", "1", "--threads", "4"]', 6.9, 2.3, 5.6, 3.35, size=17)
    takeaway(s, 'Không chạy quyền root · AI dùng Gunicorn WSGI đa luồng · Bắt SIGTERM an toàn.')

    # 12 — Nginx Reverse Proxy
    s = d.body(prs, 'Tầng Nginx Reverse Proxy Gateway (:8088)', '04 / CỔNG GIAO TIẾP & BẢO VỆ')
    card(s, .8, 1.95, 5.6, 3.65, 'Tối ưu & Bảo vệ biên',
         '• Nén Gzip giảm băng thông tải trang\n• Rate-limit 10 req/s chống dò mật khẩu\n• Gắn X-Frame-Options, nosniff, Referrer\n• Giới hạn upload CV an toàn (5 MB)', size=18)
    card(s, 6.9, 1.95, 5.6, 3.65, 'Cô lập đường dẫn nội bộ',
         '• Chặn truy cập ngoài vào /metrics (403)\n• Chặn giả mạo /internal/alert-webhook\n• Chỉ Prometheus & Alertmanager trong\n  mạng Docker mới được phép kết nối', size=18)
    takeaway(s, 'Đóng gói thành immutable image joblink-gateway, tương thích hoàn toàn Jenkins DooD.')

    # 13 — DevSecOps security posture
    s = d.body(prs, 'Bảo mật triển khai (DevSecOps Hardening)', '04 / AN TOÀN HỆ THỐNG')
    for i, (title, detail) in enumerate([
        ('0 Lỗ hổng Thư viện', 'npm audit sạch 100%\ncả prod & dev'),
        ('Chặn lộ Reset Token', 'NODE_ENV=production\nkhông trả reset_url'),
        ('Xác thực AI Nội bộ', 'Header bí mật chung\nX-JobLink-AI-Token'),
        ('Quản lý Bí mật', '.env & credentials.env\ntách khỏi Git/Image')
    ]):
        x, y = .8 + (i % 2) * 6.05, 1.88 + (i // 2) * 2.02
        card(s, x, y, 5.65, 1.88, title, detail, size=18, title_size=21)
    takeaway(s, 'Toàn bộ cổng quản trị và cơ sở dữ liệu chỉ bind trên giao diện 127.0.0.1.')

    # 14 — Readiness & Volumes
    s = d.body(prs, 'Thứ tự khởi động & Bảo toàn dữ liệu', '04 / COMPOSE & VOLUMES')
    for i, (title, detail) in enumerate([
        ('MySQL', ':3306\nHealthy'),
        ('AI', ':5000\nHealthy'),
        ('Web', ':3000\nMigrate+Ready'),
        ('Gateway', ':8088\nHealthy')
    ]):
        x = .75 + i * 3.02
        card(s, x, 2.15, 2.55, 1.95, title, detail, size=17, title_size=20)
        if i < 3:
            d.arrow(s, x + 2.58, 3.12, x + 2.98, 3.12)
    d.text(s, '6 Named Volumes bảo toàn DB, CV uploads, lịch sử Jenkins, Prometheus, Grafana & Alertmanager.',
           .85, 4.75, 11.6, .85, size=20, color=d.NAVY, bold=True)
    takeaway(s, 'Cảnh báo vận hành: Không chạy docker compose down -v để tránh xóa dữ liệu.', color=d.RED)

    # 15 — Remote deployment runbook
    s = d.body(prs, 'Triển khai qua SSH lên Google Cloud', '04 / TRIỂN KHAI PUBLIC')
    card(s, .8, 1.95, 5.6, 3.65, 'Jenkins → Registry → VPS',
         'Build 3 image web, AI và Nginx Gateway.\nGắn thẻ theo SHA rồi đẩy lên registry.\nSSH vào VPS để tải image và rollout.', size=19)
    card(s, 6.9, 1.95, 5.6, 3.65, 'Kiểm tra từ Internet',
         f'{PUBLIC_URL}\n/gateway-health và /ready → HTTP 200\n/metrics → HTTP 403', size=19)
    takeaway(s, 'Jenkins xác thực khóa máy chủ SSH và lưu kết quả kiểm tra vào nhật ký bản dựng.')

    # 16 — Full-stack observability architecture
    s = d.body(prs, 'Giám sát ứng dụng, máy chủ và container', '05 / OBSERVABILITY')
    for x, title, detail in [
        (.75, 'Thu thập 4 lớp', 'Blackbox probes\nWeb & AI /metrics\nNode Exporter · cAdvisor'),
        (4.8, 'Prometheus :9090', '12/12 targets UP trên VPS\n7 luật cảnh báo\nChu kỳ thu thập 10 giây'),
        (8.85, 'Dashboard & Cảnh báo', 'Grafana: 2 dashboard\nỨng dụng và hạ tầng\nAlertmanager: webhook')
    ]:
        card(s, x, 2.1, 3.65, 2.55, title, detail, size=18, title_size=20)
    d.arrow(s, 4.42, 3.35, 4.77, 3.35)
    d.arrow(s, 8.47, 3.35, 8.82, 3.35)
    d.text(s, 'Đối chiếu lỗi HTTP và độ trễ p95 với CPU máy chủ, RAM và CPU của từng container.',
           .85, 5.05, 11.6, .75, size=19, color=d.NAVY, bold=True)
    takeaway(s, 'Toàn bộ datasource, dashboard và alert rules được quản lý bằng mã nguồn (IaC).')

    # 17 — White-box metrics detail
    s = d.body(prs, 'Chỉ số White-box nội tại trên ứng dụng (/metrics)', '05 / APPLICATION METRICS')
    card(s, .8, 1.95, 5.6, 3.65, 'Web / Node.js Metrics',
         '• joblink_http_requests_total (RPS)\n• joblink_http_errors_total (4xx / 5xx)\n• joblink_http_request_duration_seconds\n• nodejs_resident_memory_bytes & Heap\n• nodejs_eventloop_lag_seconds', size=18)
    card(s, 6.9, 1.95, 5.6, 3.65, 'AI & Alert Ledger Metrics',
         '• joblink_ai_requests_total\n• joblink_ai_request_duration_seconds\n• joblink_ai_rag_documents\n• joblink_alert_notifications_total\n  (đếm thông báo FIRING & RESOLVED)', size=18)
    takeaway(s, 'Tự cài đặt chuẩn OpenMetrics thuần Node/Python, không thêm thư viện nặng bên ngoài.')

    # 18 — Grafana screenshot
    s = d.body(prs, 'Dashboard giám sát trực quan trên Grafana', '05 / GRAFANA PROVISIONING')
    dashboard = 'joblink-overview.png' if (DEFENSE_EVIDENCE / 'joblink-overview.png').exists() else 'grafana-dashboard.png'
    picture(s, dashboard, .8, 1.6, 11.7, 4.45)
    takeaway(s, 'JobLink Overview có 13 panel. JobLink Infrastructure có 6 panel cho host và container.')

    # 19 — Application and infrastructure alerts
    s = d.body(prs, '7 luật cảnh báo và luồng Alertmanager', '05 / ALERTING PIPELINE')
    for i, (title, detail) in enumerate([
        ('Độ sẵn sàng', 'ServiceDown · ProbeMissing'),
        ('Chất lượng API', 'SlowResponse · HighErrorRate'),
        ('Bộ nhớ', 'HighMemoryUsage · ContainerHighMemory'),
        ('CPU máy chủ', 'HostHighCPU: trên 85% trong 2 phút')
    ]):
        x, y = .8 + (i % 2) * 6.05, 1.88 + (i // 2) * 1.85
        card(s, x, y, 5.65, 1.64, title, detail, size=16, title_size=20)
    takeaway(s, 'Prometheus báo FIRING hoặc RESOLVED → Alertmanager → webhook nhận cảnh báo.')

    # 20 — Day-2 Operations
    s = d.body(prs, 'Quy trình Vận hành Day-2: Migration, Backup & Log', '06 / DAY-2 OPERATIONS')
    card(s, .8, 1.9, 5.6, 2.2, 'Idempotent DB Migration',
         'Tự động bổ sung cột/bảng mới khi Web\nkhởi động mà không làm mất dữ liệu cũ.', size=18, title_size=20)
    card(s, 6.9, 1.9, 5.6, 2.2, 'Log Rotation & SIGTERM',
         'Giới hạn json-file 10MB x 3 chống đầy đĩa;\nđóng kết nối an toàn khi cập nhật bản mới.', size=18, title_size=20)
    d.command(s, 'npm run db:backup      # Sao lưu MySQL kèm mã băm SHA-256\nnpm run db:restore     # Kiểm chứng toàn vẹn SHA-256 & phục hồi', .8, 4.38, 11.7, 1.4, size=19)
    takeaway(s, 'Đảm bảo khả năng phục hồi thảm họa (Disaster Recovery) bên cạnh Docker Volumes.')

    # 21 — Verification scorecard
    s = d.body(prs, 'Tổng hợp Kết quả Kiểm thử & Xác minh Tự động', f'06 / KẾT QUẢ KIỂM ĐỊNH ({date})')
    for i, (value, label) in enumerate([
        (f'{evidence["nodeTests"]}/{evidence["nodeTests"]}', 'Node Unit Tests'),
        (f'{evidence["smokeChecks"]}/{evidence["smokeChecks"]}', 'Smoke Checks'),
        (f'{evidence["monitoringChecks"]}/{evidence["monitoringChecks"]}', 'Checks Giám sát'),
        (str(evidence['npmAuditVulnerabilities']), 'Lỗ hổng npm audit')
    ]):
        x = .8 + i * 3.03
        d.panel(s, x, 1.95, 2.67, 2.45)
        d.text(s, value, x + .12, 2.28, 2.43, .9, size=42, color=d.GREEN,
               bold=True, align=d.PP_ALIGN.CENTER)
        d.text(s, label, x + .12, 3.5, 2.43, .6, size=18, align=d.PP_ALIGN.CENTER)
    d.text(s, 'AI Tests: 3/3 PASS  ·  Promtool Rules: 2/2 PASS  ·  Auto-Rollback & Alert Recovery: PASS',
           .85, 4.92, 11.6, .75, size=19, color=d.NAVY, bold=True)
    takeaway(s, 'Mọi chỉ số trên slide đều được trích xuất trực tiếp từ bộ kiểm thử tự động.')

    # 22 — Demo credentials
    s = d.body(prs, 'Ba luồng nghiệp vụ trên bản demo', f'DEMO / {PUBLIC_URL}')
    for i, (role, action) in enumerate([
        ('Ứng viên', 'Tìm việc và chấm điểm CV bằng AI'),
        ('Doanh nghiệp', 'Xem dashboard và hồ sơ ứng viên'),
        ('Quản trị viên', 'Xem dashboard và kiểm duyệt tin đăng')
    ]):
        y = 2.0 + i * 1.14
        d.panel(s, .8, y, 11.7, .94, d.CYAN if i % 2 == 0 else d.WHITE)
        d.text(s, role, 1.02, y + .23, 2.6, .5, size=21, color=d.NAVY, bold=True)
        d.text(s, action, 3.85, y + .23, 8.1, .5, size=20)
    takeaway(s, 'Trình tự demo: Tìm việc → Đăng nhập 3 vai trò → Chấm điểm CV & Chatbot AI.')

    # 23 — Live demo sequence
    s = d.body(prs, 'Trình tự Bảo vệ & Demo Trực tiếp (25–30 phút)', 'DEMO / KỊCH BẢN THAO TÁC')
    for i, value in enumerate([
        'Nguyễn Doãn Huy · Dockerfile, Compose, non-root và Nginx Gateway',
        'Trần Đức Nguyên · GitHub Actions, Jenkins và SonarQube',
        'Nguyễn Trần Tuấn Khôi · Pipeline SSH, URL VPS, backup và rollback',
        'Phan Văn Hiếu · AI Service, chatbot và chấm điểm CV',
        'Niê Phương Anh · Prometheus, Grafana, Node Exporter và cAdvisor',
        'Nguyễn Quang Trung · Kiểm thử 3 vai trò, smoke test và nghiệm thu'
    ]):
        y = 1.66 + i * .72
        d.text(s, f'{i+1:02}', .85, y, .7, .55, size=23, color=d.BLUE, bold=True)
        d.text(s, value, 1.75, y + .02, 10.75, .64, size=18)
    takeaway(s, 'Chi tiết câu lệnh và phương án dự phòng offline: FINAL_DEMO.md & DEMO_FLOW.md')

    # 24 — Summary & close
    s = d.body(prs, 'Tổng kết Đồ án Triển khai Phần mềm', 'KẾT LUẬN / INFO3004')
    card(s, .8, 1.95, 5.6, 3.65, 'Kết quả đạt được',
         '• 10 container hoạt động trên VPS Google Cloud\n• Pipeline Jenkins qua SSH và rollback\n• Web/AI chạy non-root, Nginx chặn /metrics\n• 12 targets UP, 7 luật, 2 dashboard\n• MySQL migration và backup SHA-256', size=17)
    card(s, 6.9, 1.95, 5.6, 3.65, 'Hướng phát triển tiếp theo',
         '• Mở rộng điều phối đa node trên Kubernetes\n  (Helm Charts & Horizontal Pod Autoscaler)\n• Bổ sung thu thập log tập trung bằng Loki\n• Tích hợp chứng chỉ TLS tự động Let\'s Encrypt\n  khi triển khai tên miền thực tế', size=18)
    takeaway(s, 'Xin cảm ơn Thầy và Hội đồng đã lắng nghe!')

    assert len(prs.slides) == TOTAL
    output = ROOT / 'JobLink_Final_Presentation.pptx'
    temporary = output.with_suffix('.tmp.pptx')
    prs.save(temporary)
    temporary.replace(output)
    print(f'Created {len(prs.slides)} final slides: {output}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', default='18/11/2026')
    parser.add_argument('--group', default='Nhóm 02 · Lớp 24IT3')
    parser.add_argument('--lecturer', default='Đặng Quốc Hữu')
    args = parser.parse_args()
    create(args.date, args.group, args.lecturer)
