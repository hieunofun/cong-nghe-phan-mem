"""Create the concise, editable JobLink Docker deck. No speaker notes."""
from pathlib import Path
import sys

# Optional shared dependencies on the demo machine; normal installs also work.
shared_packages = Path('E:/site-packages')
if shared_packages.is_dir():
    sys.path.insert(0, str(shared_packages))

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.xmlchemy import OxmlElement
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parent
NAVY = '0F2D5F'
BLUE = '007BC4'
CYAN = 'E8F6FC'
INK = '20334D'
MUTED = '53667A'
WHITE = 'FFFFFF'
LINE = 'CDE5F1'
GREEN = '137554'
RED = 'AD3F2F'
FONT = 'Arial'
TOTAL = 12


def text(slide, value, x, y, w, h, size=24, color=INK, bold=False,
         font=FONT, align=PP_ALIGN.LEFT, name=None):
    shape = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    if name:
        shape.name = name
    frame = shape.text_frame
    frame.clear()
    frame.word_wrap = True
    frame.margin_left = frame.margin_right = Inches(0.02)
    frame.margin_top = frame.margin_bottom = Inches(0.02)
    frame.vertical_anchor = MSO_ANCHOR.TOP
    for i, line in enumerate(value.split('\n')):
        p = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
        p.alignment = align
        p.space_before = Pt(0)
        p.space_after = Pt(4)
        p.line_spacing = 1.12
        p._p.get_or_add_pPr().append(OxmlElement('a:buNone'))
        run = p.add_run()
        run.text = line
        run.font.name = font
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = RGBColor.from_string(color)
    return shape


def panel(slide, x, y, w, h, fill=WHITE, border=LINE):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h)
    )
    shape.adjustments[0] = 0.06
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor.from_string(fill)
    shape.line.color.rgb = RGBColor.from_string(border)
    shape.line.width = Pt(1)
    return shape


def command(slide, value, x, y, w, h, size=22):
    panel(slide, x, y, w, h, NAVY, NAVY)
    text(slide, value, x + 0.26, y + 0.17, w - 0.52, h - 0.26,
         size=size, color=WHITE, font='Consolas', name='Command')


def arrow(slide, x1, y1, x2, y2, elbow=False):
    line = slide.shapes.add_connector(
        MSO_CONNECTOR.ELBOW if elbow else MSO_CONNECTOR.STRAIGHT,
        Inches(x1), Inches(y1), Inches(x2), Inches(y2)
    )
    line.line.color.rgb = RGBColor.from_string(BLUE)
    line.line.width = Pt(2.5)
    end = OxmlElement('a:tailEnd')
    end.set('type', 'triangle')
    line._element.spPr.get_or_add_ln().append(end)


def remove_placeholders(slide):
    for shape in list(slide.placeholders):
        node = shape._element
        node.getparent().remove(node)


def body(prs, title, section):
    # The title-only layout retains the CMC master artwork and footer.
    slide = prs.slides.add_slide(prs.slide_masters[1].slide_layouts[5])
    remove_placeholders(slide)
    text(slide, title, 0.72, 0.29, 11.9, 0.65, size=32, color=NAVY,
         bold=True, name='Slide title')
    text(slide, section, 0.76, 1.06, 10.7, 0.35, size=14, color=BLUE,
         bold=True, name='Section')
    text(slide, f'{len(prs.slides):02d} / {TOTAL}', 11.66, 1.06, 0.9, 0.35,
         size=14, color=MUTED, align=PP_ALIGN.RIGHT, name='Slide number')
    return slide


def takeaway(slide, value, color=NAVY):
    text(slide, value, 0.85, 6.17, 11.65, 0.65, size=22, color=color,
         bold=True, name='Main takeaway')


def create_presentation():
    prs = Presentation(ROOT / 'Slides Template.pptx')
    for _ in range(len(prs.slides)):
        relation_id = prs.slides._sldIdLst[0].rId
        prs.part.drop_rel(relation_id)
        del prs.slides._sldIdLst[0]

    # 1 — Opening: keep the original CMC cover artwork.
    slide = prs.slides.add_slide(prs.slide_masters[0].slide_layouts[0])
    remove_placeholders(slide)
    text(slide, 'BÀI TẬP DOCKER', 5.72, 1.86, 6.75, 0.45,
         size=18, color=WHITE, bold=True)
    text(slide, 'Triển khai JobLink\nbằng Docker', 5.69, 2.55, 6.9, 1.65,
         size=38, color=WHITE, bold=True, name='Slide title')
    text(slide, 'Web · AI · MySQL', 5.72, 4.5, 6.7, 0.65,
         size=25, color=WHITE)
    text(slide, 'Nhóm: [Tên nhóm]\nGiảng viên: [Tên giảng viên]\nNgày báo cáo: 30/10/2026',
         5.72, 5.43, 6.75, 1.1, size=17, color=WHITE)

    # 2 — Four deliverables, in the exact order requested by the assignment.
    slide = body(prs, 'Bài tập gồm 4 bước', 'LỘ TRÌNH TRÌNH BÀY')
    for x, number, title, detail in [
        (0.8, '01', 'Cài Docker', 'Chuẩn bị\nmôi trường'),
        (3.83, '02', 'Pull images', 'Tải các image\nnền tảng'),
        (6.86, '03', 'Build project', 'Đóng gói\nmã nguồn'),
        (9.89, '04', 'Run demo', 'Chạy và\nkiểm tra')
    ]:
        panel(slide, x, 2.05, 2.67, 3.35)
        text(slide, number, x + 0.22, 2.3, 2.2, 0.85, size=44, color=BLUE, bold=True)
        text(slide, title, x + 0.22, 3.43, 2.25, 0.55, size=23, color=NAVY, bold=True)
        text(slide, detail, x + 0.22, 4.22, 2.2, 0.9, size=21, color=MUTED)
    takeaway(slide, 'Mục tiêu: chạy JobLink trên máy có Docker.')

    # 3 — Show the real service connections, not a list of technologies.
    slide = body(prs, 'JobLink chạy bằng 3 dịch vụ', 'TỔNG QUAN DỰ ÁN')
    panel(slide, 0.8, 3.0, 2.3, 1.4, CYAN)
    text(slide, 'Trình duyệt', 0.98, 3.23, 1.96, 0.5, size=23, color=NAVY, bold=True)
    text(slide, 'localhost:3000', 0.98, 3.82, 1.96, 0.4, size=17, color=MUTED, font='Consolas')
    panel(slide, 3.9, 2.82, 3.1, 1.8)
    text(slide, 'WEB', 4.14, 3.05, 2.62, 0.5, size=28, color=BLUE, bold=True)
    text(slide, 'Giao diện + API\nNode.js / Express', 4.14, 3.65, 2.62, 0.8, size=20)
    panel(slide, 8.1, 1.78, 4.4, 1.75)
    text(slide, 'AI  ·  Python / Flask', 8.35, 2.0, 3.9, 0.5, size=24, color=BLUE, bold=True)
    text(slide, 'Chấm CV, gợi ý việc làm', 8.35, 2.67, 3.9, 0.5, size=21)
    panel(slide, 8.1, 4.0, 4.4, 1.75)
    text(slide, 'MYSQL  ·  Database', 8.35, 4.22, 3.9, 0.5, size=24, color=BLUE, bold=True)
    text(slide, 'Tài khoản, tin tuyển dụng', 8.35, 4.89, 3.9, 0.6, size=20)
    arrow(slide, 3.1, 3.7, 3.88, 3.7)
    arrow(slide, 7.0, 3.4, 8.08, 2.66, elbow=True)
    arrow(slide, 7.0, 4.0, 8.08, 4.87, elbow=True)
    arrow(slide, 10.3, 3.53, 10.3, 3.98)
    takeaway(slide, 'AI demo dùng TF-IDF và FAQ RAG; không cần API key.')

    # 4 — Installation: separate the action from the verification commands.
    slide = body(prs, '1. Cài và mở Docker Desktop', 'BƯỚC 1 / CÀI ĐẶT')
    for i, value in enumerate(['Cài Docker Desktop', 'Chọn WSL 2 backend', 'Đợi Engine hoạt động']):
        y = 2.03 + i * 1.13
        text(slide, str(i + 1), 0.86, y, 0.55, 0.6, size=30, color=BLUE, bold=True)
        text(slide, value, 1.62, y + 0.04, 4.8, 0.7, size=25)
    text(slide, 'Kiểm tra trong PowerShell', 7.0, 1.88, 5.1, 0.6,
         size=23, color=NAVY, bold=True)
    command(slide, 'docker version\ndocker compose version\ndocker info', 6.8, 2.73, 5.7, 2.15, size=22)
    takeaway(slide, 'Đã cài thành công khi CLI kết nối được với Docker Engine.')

    # 5 — Three base images; no dense paragraphs about the runtimes.
    slide = body(prs, '2. Tải 3 image nền tảng', 'BƯỚC 2 / PULL IMAGES')
    for x, tag, role in [
        (0.8, 'mysql:8.0', 'Cơ sở dữ liệu'),
        (4.83, 'node:22-alpine', 'Môi trường Web'),
        (8.86, 'python:3.11-slim', 'Môi trường AI')
    ]:
        panel(slide, x, 1.92, 3.65, 1.62)
        text(slide, tag, x + 0.2, 2.15, 3.25, 0.55,
             size=20, color=BLUE, bold=True, font='Consolas')
        text(slide, role, x + 0.2, 2.91, 3.25, 0.45, size=22)
    command(slide, 'docker pull mysql:8.0\ndocker pull node:22-alpine\ndocker pull python:3.11-slim',
            0.8, 4.0, 11.7, 1.85, size=22)
    takeaway(slide, 'Express và Flask được cài thêm khi build project.')

    # 6 — An excerpt only; the complete files stay in the repository.
    slide = body(prs, '3. Dockerfile mô tả cách đóng gói', 'BƯỚC 3 / BUILD PROJECT')
    text(slide, 'Trích đoạn Dockerfile của Web', 0.85, 1.67, 7.2, 0.5,
         size=22, color=NAVY, bold=True)
    command(slide, 'FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nEXPOSE 3000\nCMD ["node",\n     "scripts/docker-start.js"]',
            0.8, 2.37, 7.3, 3.28, size=18)
    for y, title, detail in [
        (2.4, 'FROM', 'Chọn môi trường chạy'),
        (3.5, 'RUN', 'Cài các thư viện'),
        (4.6, 'CMD', 'Khởi động ứng dụng')
    ]:
        text(slide, title, 8.57, y, 3.75, 0.5, size=24, color=BLUE, bold=True)
        text(slide, detail, 8.57, y + 0.55, 3.75, 0.6, size=21)
    takeaway(slide, 'Web dùng Dockerfile · AI dùng Dockerfile.ai')

    # 7 — One build command and the two exact output tags.
    slide = body(prs, 'Build mã nguồn thành 2 image', 'BƯỚC 3 / KẾT QUẢ BUILD')
    command(slide, 'docker compose build', 0.8, 1.88, 11.7, 0.95, size=28)
    for x, filename, image_name in [
        (0.8, 'Dockerfile', 'joblink-web:1.0'),
        (6.9, 'Dockerfile.ai', 'joblink-ai:1.0')
    ]:
        panel(slide, x, 3.35, 5.6, 2.25)
        text(slide, filename, x + 0.3, 3.64, 5.0, 0.6, size=23, color=MUTED, font='Consolas')
        text(slide, '→ ' + image_name, x + 0.3, 4.55, 5.0, 0.65,
             size=25, color=BLUE, bold=True, font='Consolas')
    takeaway(slide, 'Mở Docker Desktop → Images để xem kết quả build.')

    # 8 — Start command plus the real readiness order.
    slide = body(prs, '4. Chạy hệ thống bằng một lệnh', 'BƯỚC 4 / RUN')
    command(slide, 'docker compose up -d --wait', 0.8, 1.92, 11.7, 1.0, size=27)
    for x, service, role in [
        (0.8, 'MySQL', 'Cơ sở dữ liệu'),
        (5.0, 'AI', 'Xử lý AI'),
        (9.2, 'Web', 'Website + API')
    ]:
        panel(slide, x, 3.55, 3.3, 1.75)
        text(slide, service, x + 0.25, 3.82, 2.8, 0.6, size=29, color=BLUE, bold=True)
        text(slide, role, x + 0.25, 4.62, 2.8, 0.5, size=21)
    arrow(slide, 4.16, 4.4, 4.9, 4.4)
    arrow(slide, 8.36, 4.4, 9.1, 4.4)
    takeaway(slide, 'Compose chờ MySQL và AI sẵn sàng rồi mới chạy Web.')

    # 9 — Reliability, explained through visible application behavior.
    slide = body(prs, 'Compose giữ kết nối và dữ liệu', 'BƯỚC 4 / VẬN HÀNH')
    panel(slide, 0.8, 1.95, 5.6, 3.65)
    text(slide, 'Kết nối nội bộ', 1.1, 2.24, 5.0, 0.6, size=27, color=BLUE, bold=True)
    text(slide, 'Các dịch vụ gọi nhau\nbằng tên service.', 1.1, 3.08, 5.0, 1.0, size=24)
    text(slide, 'mysql:3306\nai:5000', 1.1, 4.39, 5.0, 0.9, size=23, font='Consolas')
    panel(slide, 6.9, 1.95, 5.6, 3.65)
    text(slide, 'Lưu bằng volumes', 7.2, 2.24, 5.0, 0.6, size=27, color=BLUE, bold=True)
    text(slide, 'Database và CV vẫn còn\nkhi tạo lại container.', 7.2, 3.08, 5.0, 1.0, size=24)
    text(slide, 'mysql_data\nuploads_data', 7.2, 4.39, 5.0, 0.9, size=23, font='Consolas')
    takeaway(slide, 'Lưu ý: docker compose down -v sẽ xóa volumes.', color=RED)

    # 10 — Actual checked results, not an invented performance claim.
    slide = body(prs, 'Kiểm tra trước khi demo', 'BƯỚC 4 / KIỂM TRA KẾT QUẢ')
    for x, value, label in [
        (0.8, '3 / 3', 'Container healthy'),
        (4.83, '12 / 12', 'Kiểm tra đạt'),
        (8.86, '3', 'Vai trò đăng nhập')
    ]:
        panel(slide, x, 1.95, 3.65, 2.0)
        text(slide, value, x + 0.15, 2.19, 3.35, 0.85, size=42,
             color=GREEN, bold=True, align=PP_ALIGN.CENTER)
        text(slide, label, x + 0.15, 3.31, 3.35, 0.5, size=21, align=PP_ALIGN.CENTER)
    command(slide, 'docker compose ps\nnode scripts/docker-check.js', 0.8, 4.45, 11.7, 1.3, size=23)
    takeaway(slide, 'Đã kiểm tra: đăng nhập, tìm việc, dashboard và AI.')

    # 11 — Large, readable demo credentials; no paragraphs or tiny screenshot.
    slide = body(prs, 'Demo trực tiếp trên trình duyệt', 'THAO TÁC DEMO')
    text(slide, 'http://localhost:3000', 0.85, 1.74, 11.7, 0.75,
         size=30, color=BLUE, bold=True, font='Consolas')
    rows = [
        ('Ứng viên', 'candidate@joblink.vn', 'Candidate@123'),
        ('Doanh nghiệp', 'hr@vietsoft.vn', 'Company@123'),
        ('Admin', 'admin@joblink.vn', 'Admin@123')
    ]
    for i, (role, email, password) in enumerate(rows):
        y = 2.81 + i * 0.98
        panel(slide, 0.8, y, 11.7, 0.82, CYAN if i % 2 == 0 else WHITE)
        text(slide, role, 1.02, y + 0.18, 2.4, 0.5, size=21, color=NAVY, bold=True)
        text(slide, email, 3.75, y + 0.18, 4.75, 0.5, size=21, font='Consolas')
        text(slide, password, 9.03, y + 0.18, 3.15, 0.5, size=21, font='Consolas')
    takeaway(slide, 'Tìm việc → Đăng nhập → Xem dashboard → Thử AI')

    # 12 — Close with the four completed requirements and one memorable command.
    slide = body(prs, 'Đã hoàn thành 4 yêu cầu bài tập', 'TỔNG KẾT')
    text(slide, 'Cài đặt → Pull → Build → Run', 0.85, 1.96, 11.7, 0.75,
         size=31, color=NAVY, bold=True)
    panel(slide, 0.8, 3.05, 11.7, 2.55, NAVY, NAVY)
    text(slide, 'Chạy lại JobLink bằng một lệnh', 1.1, 3.38, 11.1, 0.65,
         size=27, color=WHITE, bold=True)
    text(slide, 'docker compose up -d --wait', 1.1, 4.43, 11.1, 0.65,
         size=28, color=WHITE, font='Consolas')
    takeaway(slide, 'Cảm ơn thầy và các bạn!')

    # The user's preference is explicit: do not create speaker-note content.
    assert len(prs.slides) == TOTAL
    output = ROOT / 'JobLink_Docker_Presentation.pptx'
    temporary = ROOT / 'JobLink_Docker_Presentation.tmp.pptx'
    prs.save(temporary)
    temporary.replace(output)
    print(f'Created {len(prs.slides)} concise slides: {output}')


if __name__ == '__main__':
    create_presentation()
