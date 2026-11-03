"""Editable midterm PowerPoint, based on the CMC template, without speaker notes."""
from pathlib import Path
import argparse
import json
import sys

sys.path.insert(0, 'E:/site-packages')
from PIL import Image
from pptx import Presentation
from pptx.util import Inches
import generate_joblink_slides as d

ROOT = Path(__file__).resolve().parent
EVIDENCE = ROOT / 'artifacts' / 'midterm-demo'
TOTAL = 22
d.TOTAL = TOTAL


def card(slide, x, y, w, h, title, detail, size=23):
    d.panel(slide, x, y, w, h)
    d.text(slide, title, x + .24, y + .22, w - .48, .65,
           size=25, color=d.BLUE, bold=True)
    d.text(slide, detail, x + .24, y + 1.08, w - .48, h - 1.2, size=size)


def picture(slide, filename, x, y, w, h):
    file = EVIDENCE / filename
    if not file.exists():
        raise FileNotFoundError(f'Capture actual demo evidence first: {file}')
    with Image.open(file) as im:
        iw, ih = im.size
    scale = min(w / iw, h / ih)
    pw, ph = iw * scale, ih * scale
    slide.shapes.add_picture(str(file), Inches(x + (w-pw)/2), Inches(y + (h-ph)/2),
                             width=Inches(pw), height=Inches(ph))


def create(date, group=None, lecturer=None):
    evidence = json.loads((EVIDENCE / 'verification.json').read_text(encoding='utf-8'))
    build = json.loads((EVIDENCE / 'jenkins-build.json').read_text(encoding='utf-8'))
    if build['result'] != 'SUCCESS':
        raise ValueError('The latest recorded Jenkins build must be SUCCESS')
    prs = Presentation(ROOT / 'Slides Template.pptx')
    for _ in range(len(prs.slides)):
        rel = prs.slides._sldIdLst[0].rId
        prs.part.drop_rel(rel)
        del prs.slides._sldIdLst[0]

    # 1 — Cover: no invented lecturer or team details.
    s = prs.slides.add_slide(prs.slide_masters[0].slide_layouts[0])
    d.remove_placeholders(s)
    d.text(s, 'BÁO CÁO GIỮA KỲ · INFO3004', 5.72, 1.86, 6.75, .45,
           size=18, color=d.WHITE, bold=True)
    d.text(s, 'JobLink\nTriển khai phần mềm', 5.69, 2.55, 6.9, 1.65,
           size=36, color=d.WHITE, bold=True, name='Slide title')
    d.text(s, 'Git · Jenkins · Docker · Giám sát', 5.72, 4.5, 6.75, .65,
           size=23, color=d.WHITE)
    info = [f'Ngày cập nhật: {date}', 'Nền tảng tuyển dụng Web · AI · MySQL']
    if group:
        info.insert(0, f'Nhóm: {group}')
    if lecturer:
        info.insert(1, f'Giảng viên: {lecturer}')
    d.text(s, '\n'.join(info), 5.72, 5.43, 6.75, 1.4, size=17, color=d.WHITE)

    # 2 — The five sections required by the supplied presentation outline.
    s = d.body(prs, 'Nội dung trình bày', 'LỘ TRÌNH / 5 PHẦN')
    for i, (title, detail) in enumerate([
        ('Bài toán', 'Người dùng\n& mục tiêu'), ('Công nghệ', 'Ứng dụng\n& DevOps'),
        ('SCM / CI/CD', 'Git\n& Jenkins'), ('Docker', 'Images\n& volumes'),
        ('Giám sát', 'Dashboard\n& vận hành')
    ]):
        x = .8 + i * 2.4
        d.panel(s, x, 2.05, 2.1, 3.45)
        d.text(s, f'0{i+1}', x+.16, 2.3, 1.8, .8, size=42, color=d.BLUE, bold=True)
        d.text(s, title, x+.16, 3.45, 1.8, .55, size=21, color=d.NAVY, bold=True)
        d.text(s, detail, x+.16, 4.25, 1.8, 1.0, size=18, color=d.MUTED)
    d.takeaway(s, 'Mục tiêu demo: từ mã nguồn đến hệ thống đang chạy và được giám sát.')

    # 3 — Problem and objective.
    s = d.body(prs, 'Kết nối ứng viên và doanh nghiệp', '01 / TỔNG QUAN BÀI TOÁN')
    card(s, .8, 2.0, 5.6, 3.6, 'Nhu cầu', 'Ứng viên tìm việc phù hợp.\nDoanh nghiệp tiếp nhận CV.\nQuản trị viên kiểm soát nội dung.', size=23)
    card(s, 6.9, 2.0, 5.6, 3.6, 'Mục tiêu JobLink', 'Tập trung quy trình tuyển dụng.\nHỗ trợ tìm kiếm và xử lý CV.\nĐóng gói để triển khai nhất quán.', size=23)
    d.takeaway(s, 'Sản phẩm nhóm: nền tảng tuyển dụng với ba vai trò người dùng.')

    # 4 — Product features by role.
    s = d.body(prs, 'Ba vai trò, ba luồng sử dụng', '01 / CHỨC NĂNG CHÍNH')
    for x, title, detail in [
        (.8, 'Ứng viên', 'Tìm và lưu việc làm\nQuản lý hồ sơ, CV\nTheo dõi ứng tuyển\nGợi ý việc bằng AI'),
        (4.83, 'Doanh nghiệp', 'Quản lý tin tuyển dụng\nXem hồ sơ ứng tuyển\nĐánh giá mức phù hợp\nTheo dõi dashboard'),
        (8.86, 'Quản trị viên', 'Quản lý tài khoản\nDuyệt doanh nghiệp\nQuản lý nội dung\nXem số liệu tổng quan')
    ]:
        card(s, x, 1.95, 3.65, 3.9, title, detail, size=21)
    d.takeaway(s, 'Demo tập trung vào tìm việc, đăng nhập, dashboard và AI.')

    # 5 — Reuse the existing clear three-service architecture.
    s = d.body(prs, 'Kiến trúc ứng dụng JobLink', '02 / WEB · AI · MYSQL')
    card(s, .8, 3.0, 2.4, 1.7, 'Trình duyệt', 'localhost:3000', size=17)
    card(s, 4.0, 2.85, 3.0, 1.95, 'Web / Express', 'Giao diện và API', size=20)
    card(s, 8.15, 1.85, 4.35, 1.7, 'AI / Flask', 'CV matching · FAQ RAG', size=20)
    card(s, 8.15, 4.0, 4.35, 1.7, 'MySQL', 'Tài khoản · tin · hồ sơ', size=20)
    d.arrow(s, 3.2, 3.85, 3.98, 3.85)
    d.arrow(s, 7.0, 3.4, 8.13, 2.7, elbow=True)
    d.arrow(s, 7.0, 4.2, 8.13, 4.85, elbow=True)
    d.arrow(s, 10.3, 3.55, 10.3, 3.98)
    d.takeaway(s, 'Các dịch vụ kết nối qua mạng Docker bằng tên web, ai và mysql.')

    # 6 — Six concise technology cards.
    s = d.body(prs, 'Công nghệ và công cụ sử dụng', '02 / NỀN TẢNG TRIỂN KHAI')
    for i, (title, detail) in enumerate([
        ('Node.js 22', 'Express · Web / API'), ('Python 3.11', 'Flask · AI lightweight'),
        ('MySQL 8.0', 'Dữ liệu nghiệp vụ'), ('Git + Jenkins', 'Quản lý mã · CI/CD'),
        ('Docker Compose', 'Đóng gói · chạy dịch vụ'), ('Giám sát', 'Prometheus + Grafana')
    ]):
        x, y = .8 + (i%3)*4.03, 1.9 + (i//3)*2.0
        card(s, x, y, 3.65, 1.75, title, detail, size=19)
    d.takeaway(s, 'Máy demo: Windows + PowerShell + Docker Desktop / WSL 2.')

    # 7 — Describe actual local-vs-SCM behavior, not an unverified GitHub webhook.
    s = d.body(prs, 'Quản lý mã nguồn bằng Git', '03 / SCM')
    d.command(s, 'git status\ngit diff\ngit log --oneline -5', .8, 2.0, 5.6, 2.2, size=25)
    card(s, 6.9, 2.0, 5.6, 3.55, 'Hai cách lấy source', 'LOCAL: bản đang làm trên máy.\nSCM: checkout từ Git URL / branch.\nSCM polling: khoảng mỗi 5 phút.', size=23)
    d.text(s, 'Nhánh hiện tại: main', .9, 4.65, 5.3, .65, size=25, bold=True, color=d.NAVY)
    d.takeaway(s, 'Chế độ SCM cần commit / push các file mới trước khi dùng.')

    # 8 — Six pipeline stages, in two spacious rows.
    s = d.body(prs, 'Jenkins tự động hóa sáu bước', '03 / PIPELINE CI/CD')
    for i, (title, detail) in enumerate([
        ('1. Source', 'Lấy mã nguồn'), ('2. Node tests', 'Kiểm thử Web / API'),
        ('3. Build', 'Tạo hai images'), ('4. AI tests', 'Kiểm thử matching'),
        ('5. Deploy', 'Thay Web / AI'), ('6. Smoke checks', 'Kiểm tra sau triển khai')
    ]):
        x, y = .8 + (i%3)*4.03, 1.9 + (i//3)*2.0
        card(s, x, y, 3.65, 1.75, title, detail, size=20)
    d.takeaway(s, 'Lỗi sau khi thay container → khôi phục image trước; build vẫn báo thất bại.')

    # 9 — Real Jenkins screenshot, not a fabricated success state.
    s = d.body(prs, f'Jenkins build #{build["number"]}: {build["result"]}', '03 / KẾT QUẢ PIPELINE THỰC TẾ')
    picture(s, 'jenkins-pipeline.png', .8, 1.65, 11.7, 4.35)
    d.takeaway(s, 'http://localhost:8080  →  joblink-local  →  Build with Parameters')

    # 10 — Install and pull.
    s = d.body(prs, 'Chuẩn bị Docker và images nền tảng', '04 / CÀI ĐẶT VÀ PULL')
    card(s, .8, 1.95, 5.6, 3.8, 'Môi trường', 'Docker Desktop\nWSL 2 / Linux containers\nĐợi Engine hoạt động\nKiểm tra bằng docker version', size=24)
    d.command(s, 'docker pull mysql:8.0\ndocker pull node:22-alpine\ndocker pull python:3.11-slim', 6.9, 2.35, 5.6, 2.4, size=20)
    d.takeaway(s, 'Ba image nền tảng cung cấp môi trường chạy cho Web, AI và database.')

    # 11 — Readable excerpts from the actual Dockerfiles.
    s = d.body(prs, 'Dockerfile đóng gói mã nguồn', '04 / BUILD WEB VÀ AI')
    d.text(s, 'Web · Dockerfile', .85, 1.7, 5.6, .6, size=25, color=d.BLUE, bold=True)
    d.text(s, 'AI · Dockerfile.ai', 6.95, 1.7, 5.6, .6, size=25, color=d.BLUE, bold=True)
    d.command(s, 'FROM node:22-alpine\nWORKDIR /app\nRUN npm ci --omit=dev\nEXPOSE 3000\nCMD ["node",\n "scripts/docker-start.js"]', .8, 2.5, 5.6, 2.7, size=19)
    d.command(s, 'FROM python:3.11-slim\nWORKDIR /app\nENV AI_LIGHTWEIGHT_MODE=true\nEXPOSE 5000\nCMD ["python",\n "ai_service/app.py"]', 6.9, 2.5, 5.6, 2.7, size=19)
    d.takeaway(s, 'Trích đoạn rút gọn · .dockerignore loại .env, dữ liệu và file phụ khỏi image.')

    # 12 — Compose dependencies and ports.
    s = d.body(prs, 'Compose điều phối ba dịch vụ', '04 / CONTAINER VÀ HEALTHCHECK')
    for x, title, detail in [(.8,'MySQL','127.0.0.1:3306'),(5.0,'AI','localhost:5000'),(9.2,'Web','localhost:3000')]:
        card(s, x, 2.45, 3.3, 1.9, title, detail, size=19)
    d.arrow(s, 4.13, 3.4, 4.92, 3.4)
    d.arrow(s, 8.33, 3.4, 9.12, 3.4)
    d.text(s, 'MySQL healthy  →  AI healthy  →  Web khởi động', .9, 5.0, 11.5, .65,
           size=27, color=d.NAVY, bold=True)
    d.takeaway(s, 'Các cổng chỉ được publish trên localhost của máy demo.')

    # 13 — Volumes protect data.
    s = d.body(prs, 'Tạo lại container vẫn giữ dữ liệu', '04 / VOLUMES')
    card(s, .8, 2.0, 5.6, 3.6, 'Dữ liệu ứng dụng', 'joblink_mysql_data\nDatabase: tài khoản, tin, hồ sơ\n\njoblink_uploads_data\nCV, avatar và logo', size=22)
    card(s, 6.9, 2.0, 5.6, 3.6, 'Dữ liệu DevOps', 'Jenkins: lịch sử build\nPrometheus: lịch sử số liệu\nGrafana: dữ liệu dashboard\n\nLưu riêng bằng named volumes', size=22)
    d.takeaway(s, 'Không chạy docker compose down -v vì sẽ xóa volumes.', color=d.RED)

    # 14 — Actual, runnable commands.
    s = d.body(prs, 'Chạy toàn bộ hệ thống demo', '04 / TRIỂN KHAI TRÊN MÁY')
    d.command(s, 'node scripts/devops-demo.js up', .8, 2.0, 11.7, 1.0, size=27)
    d.command(s, 'node scripts/devops-demo.js build\nnode scripts/devops-demo.js check', .8, 3.55, 11.7, 1.5, size=26)
    d.text(s, 'up: chạy dịch vụ    build: chạy pipeline    check: xác minh', .9, 5.5, 11.5, .6,
           size=23, color=d.NAVY, bold=True)
    d.takeaway(s, 'Mật khẩu Jenkins / Grafana: node scripts/devops-demo.js credentials')

    # 15 — Monitoring architecture.
    s = d.body(prs, 'Giám sát từ kiểm tra đến dashboard', '05 / MONITORING')
    for x, title, detail in [
        (.8, 'Blackbox', 'Kiểm tra HTTP / TCP'), (5.0, 'Prometheus', 'Thu thập mỗi 10 giây'),
        (9.2, 'Grafana', 'Hiển thị dashboard')
    ]:
        card(s, x, 2.3, 3.3, 2.1, title, detail, size=20)
    d.arrow(s, 4.13, 3.35, 4.92, 3.35)
    d.arrow(s, 8.33, 3.35, 9.12, 3.35)
    d.text(s, '4 probes: Web · AI · MySQL TCP · API truy vấn database', .9, 5.15, 11.5, .65,
           size=25, color=d.NAVY, bold=True)
    d.takeaway(s, 'Theo dõi khả dụng và thời gian phản hồi; xem logs khi cần tìm nguyên nhân.')

    # 16 — Real dashboard evidence.
    s = d.body(prs, 'Dashboard giám sát JobLink', '05 / GRAFANA')
    picture(s, 'grafana-dashboard.png', .8, 1.6, 11.7, 4.5)
    d.takeaway(s, 'http://localhost:3001/d/joblink-overview')

    # 17 — Concrete, tested alert conditions.
    s = d.body(prs, 'Phát hiện lỗi và theo dõi hồi phục', '05 / CẢNH BÁO')
    for x, title, detail in [
        (.8, 'Dịch vụ DOWN', 'Probe thất bại\nliên tục 30 giây'),
        (4.83, 'Mất probe', 'Không thu được số liệu\nliên tục 30 giây'),
        (8.86, 'Phản hồi chậm', 'Trên 2 giây\nkéo dài 1 phút')
    ]:
        card(s, x, 2.0, 3.65, 2.7, title, detail, size=22)
    d.text(s, 'Dừng AI → probe DOWN → cảnh báo → chạy lại → hồi phục', .9, 5.25, 11.5, .65,
           size=25, color=d.NAVY, bold=True)
    d.takeaway(s, 'Xem cảnh báo: localhost:9090/alerts · Chưa gửi thông báo ra ngoài.')

    # 18 — Operator commands.
    s = d.body(prs, 'Các lệnh vận hành khi demo', '05 / LOGS VÀ TÀI NGUYÊN')
    for y, label, command in [
        (1.9, 'Trạng thái', 'node scripts/devops-demo.js status'),
        (3.17, 'Nhật ký Web / AI', 'docker compose logs --tail 50 web ai'),
        (4.44, 'CPU / bộ nhớ', 'docker stats --no-stream')
    ]:
        d.text(s, label, .85, y+.16, 3.1, .55, size=24, color=d.BLUE, bold=True)
        d.command(s, command, 4.0, y, 8.5, .98, size=22)
    d.takeaway(s, 'Dừng an toàn: node scripts/devops-demo.js stop')

    # 19 — Verified counts are read from evidence, not hard-coded successes.
    s = d.body(prs, 'Kết quả kiểm tra thực tế', f'XÁC MINH / {date}')
    for i, (value, label) in enumerate([
        (str(evidence['nodeTests']), 'Tests Node đạt'), (str(evidence['aiTests']), 'Tests AI đạt'),
        (str(evidence['smokeChecks']), 'Luồng smoke đạt'), (str(evidence['monitoringChecks']), 'Checks giám sát')
    ]):
        x = .8+i*3.03
        d.panel(s, x, 2.0, 2.67, 2.5)
        d.text(s, value, x+.15, 2.35, 2.37, .9, size=48, color=d.GREEN,
               bold=True, align=d.PP_ALIGN.CENTER)
        d.text(s, label, x+.15, 3.62, 2.37, .6, size=19, align=d.PP_ALIGN.CENTER)
    d.text(s, f'Jenkins #{build["number"]}: SUCCESS  ·  Web / AI / MySQL healthy', .9, 5.1, 11.5, .7,
           size=27, color=d.NAVY, bold=True)
    d.takeaway(s, 'Đã kiểm tra trình duyệt, alert DOWN / hồi phục và dữ liệu sau triển khai.')

    # 20 — Demo credentials.
    s = d.body(prs, 'Tài khoản demo ba vai trò', 'DEMO / http://localhost:3000')
    for i, (role, email, password) in enumerate([
        ('Ứng viên','candidate@joblink.vn','Candidate@123'),
        ('Doanh nghiệp','hr@vietsoft.vn','Company@123'),
        ('Admin','admin@joblink.vn','Admin@123')
    ]):
        y = 2.0+i*1.14
        d.panel(s, .8, y, 11.7, .94, d.CYAN if i%2 == 0 else d.WHITE)
        d.text(s, role, 1.02, y+.23, 2.5, .5, size=21, color=d.NAVY, bold=True)
        d.text(s, email, 3.75, y+.23, 4.75, .5, size=21, font='Consolas')
        d.text(s, password, 9.03, y+.23, 3.15, .5, size=21, font='Consolas')
    d.takeaway(s, 'Tìm việc → Đăng nhập → Xem dashboard → Thử AI')

    # 21 — A visual sequence for live demonstration, without spoken notes.
    s = d.body(prs, 'Demo từ triển khai đến giám sát', 'DEMO / TRÌNH TỰ THAO TÁC')
    for i, value in enumerate([
        'Xem Git và các file Docker / Jenkinsfile',
        'Chạy pipeline, xem sáu stages và kết quả kiểm thử',
        'Mở JobLink, thử tìm việc và đăng nhập',
        'Xem Grafana và Prometheus Alerts',
        'Dừng / chạy lại AI để minh họa hồi phục'
    ]):
        y=1.7+i*.83
        d.text(s, f'{i+1:02}', .87, y, .72, .6, size=29, color=d.BLUE, bold=True)
        d.text(s, value, 1.9, y+.03, 10.5, .65, size=25)
    d.takeaway(s, 'Các lệnh và bằng chứng: MIDTERM_DEMO.md')

    # 22 — Honest scope and a concise close.
    s = d.body(prs, 'Hoàn thành triển khai đến Docker', 'TỔNG KẾT / PHẠM VI GIỮA KỲ')
    card(s, .8, 2.0, 5.6, 3.6, 'Đã triển khai', 'Web / AI / MySQL trên Docker\nJenkins: tests, build và deploy\nDashboard và cảnh báo\nPowerPoint không có notes', size=23)
    card(s, 6.9, 2.0, 5.6, 3.6, 'Giới hạn demo', 'AI: TF-IDF và FAQ RAG\nOAuth / SMTP / thanh toán: chưa cấu hình\nSCM remote: chờ commit / push\nMôi trường demo: localhost', size=22)
    d.takeaway(s, 'Git → Jenkins → Docker → Giám sát')

    assert len(prs.slides) == TOTAL
    output = ROOT / 'JobLink_Midterm_Presentation.pptx'
    temporary = output.with_suffix('.tmp.pptx')
    prs.save(temporary)
    temporary.replace(output)
    print(f'Created {len(prs.slides)} slides: {output}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', default='04/11/2026')
    parser.add_argument('--group')
    parser.add_argument('--lecturer')
    args = parser.parse_args()
    create(args.date, args.group, args.lecturer)
