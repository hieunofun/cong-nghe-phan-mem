"""Generate the 17-slide Docker Compose and Kubernetes Presentation for Group 02."""
from pathlib import Path
import sys

shared_packages = Path('E:/site-packages')
if shared_packages.is_dir():
    sys.path.insert(0, str(shared_packages))

from pptx import Presentation
from pptx.util import Inches
import generate_joblink_slides as d

ROOT = Path(__file__).resolve().parent
TOTAL = 17
d.TOTAL = TOTAL


def takeaway(slide, value, color=d.NAVY):
    d.text(slide, value, 0.85, 6.18, 11.65, 0.65, size=17.5, color=color,
           bold=True, name='Main takeaway')


def card(slide, x, y, w, h, title, detail, size=15, title_size=19):
    d.panel(slide, x, y, w, h)
    d.text(slide, title, x + 0.2, y + 0.14, w - 0.4, 0.48,
           size=title_size, color=d.BLUE, bold=True)
    d.text(slide, detail, x + 0.2, y + 0.64, w - 0.4, h - 0.72, size=size)


def create_deck(date='19/11/2026', group='Nhóm 02 · Lớp 24IT3', lecturer='Đặng Quốc Hữu'):
    prs = Presentation(ROOT / 'Slides Template.pptx')
    for _ in range(len(prs.slides)):
        rel = prs.slides._sldIdLst[0].rId
        prs.part.drop_rel(rel)
        del prs.slides._sldIdLst[0]

    # 1 — Cover
    s = prs.slides.add_slide(prs.slide_masters[0].slide_layouts[0])
    d.remove_placeholders(s)
    d.text(s, 'BÁO CÁO BÀI TẬP NHÓM 02 · INFO3004', 5.72, 1.72, 6.75, 0.45,
           size=18, color=d.WHITE, bold=True)
    d.text(s, 'Tìm hiểu & Triển khai\nDocker Compose & K8s', 5.69, 2.32, 6.9, 1.62,
           size=35, color=d.WHITE, bold=True, name='Slide title')
    d.text(s, 'Từ Single-Host Orchestration đến Multi-Node Cluster', 5.72, 4.15, 6.75, 0.52,
           size=19, color=d.WHITE)
    info = [
        f'Thực hiện: {group}',
        'Hiếu · Huy · Khôi · Nguyên · Phương Anh · Trung',
        f'Giảng viên hướng dẫn: {lecturer}',
        f'Hà Nội, tháng 11/2026 ({date})'
    ]
    d.text(s, '\n'.join(info), 5.72, 4.92, 6.85, 1.85, size=15.5, color=d.WHITE)

    # 2 — Agenda (5 sections)
    s = d.body(prs, 'Lộ trình tìm hiểu & trình bày', 'NỘI DUNG CHÍNH')
    items = [
        ('01', 'Đặt vấn đề', 'Nhu cầu điều phối\nMulti-container'),
        ('02', 'Docker Compose', 'Quản lý đa dịch vụ\ntrên một Host'),
        ('03', 'Kubernetes', 'Điều phối phân tán\ntrên cụm Cluster'),
        ('04', 'So sánh đối chiếu', 'Tiêu chí kỹ thuật\n& Khi nào dùng gì'),
        ('05', 'Thực tế JobLink', 'Kiến trúc Compose\n& Manifest K8s')
    ]
    for i, (num, title, desc) in enumerate(items):
        x = 0.72 + i * 2.38
        d.panel(s, x, 2.0, 2.22, 3.85)
        d.text(s, num, x + 0.16, 2.22, 1.9, 0.75, size=36, color=d.BLUE, bold=True)
        d.text(s, title, x + 0.16, 3.15, 1.9, 0.75, size=16, color=d.NAVY, bold=True)
        d.text(s, desc, x + 0.16, 4.02, 1.9, 1.45, size=14.5, color=d.MUTED)
    takeaway(s, 'Mục tiêu: Nắm vững bản chất, so sánh khách quan và làm chủ kỹ năng triển khai thực tế.')

    # 3 — Problem & Orchestration Need
    s = d.body(prs, 'Từ Container đơn lẻ đến Nhu cầu Điều phối', '01 / ĐẶT VẤN ĐỀ')
    card(s, 0.8, 1.88, 5.6, 4.05, 'Thách thức khi dùng Docker thuần',
         '• Chạy docker run thủ công: Lệnh quá dài, khó nhớ cờ\n• Mạng nội bộ: Phải gán IP/port thủ công giữa các dịch vụ\n• Rủi ro mất dữ liệu: Dễ quên mount volume khi tạo mới\n• Khó kiểm soát thứ tự: Web gọi DB khi DB chưa sẵn sàng\n• Bất khả thi khi hệ thống mở rộng lên 4–9 container', size=15)
    card(s, 6.9, 1.88, 5.6, 4.05, 'Giải pháp Container Orchestration',
         '• Chuyển từ lệnh thủ công sang Infrastructure as Code (IaC)\n• Tự động hóa cấu hình mạng, cổng, volume và bảo mật\n• Đảm bảo tính nhất quán giữa môi trường Dev, Test và Prod\n• Quản lý vòng đời dịch vụ: Khởi động, dừng, kiểm tra sức khỏe\n• Tự phục hồi và sẵn sàng mở rộng quy mô khi tải tăng', size=15)
    takeaway(s, 'Container Orchestration là bước chuyển tất yếu từ đóng gói mã nguồn sang vận hành hệ thống.')

    # 4 — Docker Compose Overview
    s = d.body(prs, 'Docker Compose: Điều phối Đa dịch vụ trên 1 Host', '02 / DOCKER COMPOSE')
    card(s, 0.8, 1.88, 5.6, 4.05, 'Bản chất & Triết lý',
         '• Công cụ chính thức của Docker để định nghĩa ứng dụng multi-container.\n• Sử dụng duy nhất một file khai báo YAML: docker-compose.yml.\n• Mọi thông tin kiến trúc được phiên bản hóa cùng mã nguồn Git.\n• Triết lý tối giản: Dễ tiếp cận, trực quan, không cần cài đặt cụm server phức tạp.\n• Giúp lập trình viên tập trung vào viết mã nghiệp vụ.', size=15)
    card(s, 6.9, 1.88, 5.6, 4.05, 'Lợi ích thực tế',
         '• Khởi động toàn bộ hệ thống bằng một lệnh: docker compose up -d.\n• Tự động tạo mạng ảo Bridge cô lập cho các container.\n• Tự động phân giải DNS nội bộ: Web gọi sang AI bằng http://ai:5000.\n• Tái tạo môi trường phát triển (Dev Environment) chỉ trong vài giây.\n• Tối ưu kiểm thử tự động trong các pipeline CI/CD.', size=15)
    takeaway(s, 'Docker Compose biến việc vận hành hệ thống phức tạp thành thao tác khai báo tệp tin duy nhất.')

    # 5 — Docker Compose 4 Pillars
    s = d.body(prs, 'Cấu trúc 4 trụ cột trong file docker-compose.yml', '02 / CẤU TRÚC COMPOSE')
    for i, (title, detail) in enumerate([
        ('services', '• Image / Build context của từng container\n• Port bindings (chỉ bind 127.0.0.1)\n• Biến môi trường & bí mật (.env)\n• Restart policy & User non-root an toàn'),
        ('networks', '• Mạng ảo nội bộ (Bridge cô lập)\n• Tự động phân giải DNS theo tên service\n• Web, AI, MySQL giao tiếp thông suốt\n• Chặn truy cập trực tiếp từ mạng ngoài'),
        ('volumes', '• Named volumes lưu dữ liệu bền vững\n• Bảo toàn DB MySQL & tệp upload\n• Bind mounts gắn mã nguồn khi phát triển\n• Tách dữ liệu khỏi vòng đời container'),
        ('depends_on', '• Kết hợp điều kiện service_healthy\n• MySQL Healthy -> Web mới khởi động\n• Loại bỏ lỗi crash kết nối DB khi boot\n• Healthcheck kiểm tra liveness định kỳ')
    ]):
        x, y = 0.8 + (i % 2) * 6.05, 1.88 + (i // 2) * 2.05
        card(s, x, y, 5.65, 1.95, title, detail, size=14, title_size=19)
    takeaway(s, '4 trụ cột kết hợp tạo nên một môi trường chạy ứng dụng hoàn chỉnh, độc lập và tái lập được.')

    # 6 — Docker Compose Pros & Limits
    s = d.body(prs, 'Ưu điểm & Giới hạn khi lên Production', '02 / ĐÁNH GIÁ COMPOSE')
    card(s, 0.8, 1.88, 5.6, 4.05, 'Điểm mạnh vượt trội',
         '• Cực kỳ nhẹ nhàng, tích hợp sẵn trong Docker Desktop/CLI\n• Cú pháp YAML ngắn gọn, thân thiện, dễ học cho lập trình viên\n• Chạy mượt mà trên máy cá nhân và máy chủ đơn lẻ (VPS)\n• Phục vụ hoàn hảo các bài toán Staging, QA và CI Runner\n• Tiết kiệm tối đa chi phí hạ tầng và công sức cài đặt', size=15)
    card(s, 6.9, 1.88, 5.6, 4.05, 'Giới hạn trên Production lớn',
         '• Điểm nghẽn Single-Host: Khi máy chủ vật lý chết, toàn bộ chết\n• Không hỗ trợ tự động mở rộng đa máy chủ (Multi-node Scaling)\n• Không tự động dời container sang máy khác khi Node sập\n• Không có cơ chế Rolling Update không downtime nâng cao\n• Khó khăn trong quản lý phân quyền và giới hạn tài nguyên', size=15)
    takeaway(s, 'Docker Compose đạt đỉnh cao ở môi trường đơn máy chủ, nhưng đòi hỏi bước tiến mới trên môi trường phân tán.')

    # 7 — Kubernetes Introduction
    s = d.body(prs, 'Kubernetes (K8s): Bước tiến hóa lên Quy mô lớn', '03 / KUBERNETES')
    card(s, 0.8, 1.88, 5.6, 4.05, 'Nguồn gốc & Sứ mệnh K8s',
         '• Khởi nguồn từ hệ thống nội bộ Borg & Omega của Google với hơn 15 năm kinh nghiệm.\n• Được chuyển giao cho tổ chức CNCF (Cloud Native Computing Foundation).\n• Trở thành chuẩn công nghiệp cho điều phối container trên đám mây.\n• Sứ mệnh: Quản lý hàng nghìn container trên cụm hàng trăm máy chủ vật lý hoặc đám mây.', size=15)
    card(s, 6.9, 1.88, 5.6, 4.05, 'Triết lý "Desired State"',
         '• Lập trình viên khai báo trạng thái mong muốn qua tệp YAML.\n• Kubernetes liên tục giám sát trạng thái thực tế của hệ thống.\n• Nếu có sai lệch (ví dụ: 1 Pod bị chết), K8s tự động sửa chữa để đưa về đúng trạng thái mong muốn (Reconciliation Loop).\n• Xây dựng hệ thống có tính tự trị (Autonomic Computing) rất cao.', size=15)
    takeaway(s, 'Kubernetes không chỉ là công cụ chạy container, mà là một hệ điều hành đám mây toàn diện.')

    # 8 — Kubernetes Architecture (Master vs Worker)
    s = d.body(prs, 'Kiến trúc Phân tầng: Control Plane vs Worker Node', '03 / KIẾN TRÚC K8S')
    card(s, 0.8, 1.88, 5.6, 4.05, 'Control Plane (Master Node)',
         'Bộ não điều hành toàn bộ cụm:\n• kube-apiserver: Cổng giao tiếp REST API duy nhất của cụm\n• etcd: CSDL phân tán lưu trữ toàn bộ cấu hình & trạng thái\n• kube-scheduler: Quyết định Pod nào sẽ chạy trên Node nào\n• kube-controller-manager: Giám sát vòng đời, node, endpoint', size=15)
    card(s, 6.9, 1.88, 5.6, 4.05, 'Worker Nodes (Máy công nhân)',
         'Nơi ứng dụng container thực sự vận hành:\n• kubelet: Agent đại diện trên mỗi Node, nhận lệnh từ Master\n• kube-proxy: Định tuyến mạng, cân bằng tải iptables/IPVS\n• Container Runtime: Môi trường chạy container (containerd, CRI-O)\n• Pods: Chứa các container nghiệp vụ thực tế', size=15)
    takeaway(s, 'Kiến trúc tách rời giúp mở rộng vô hạn số lượng Worker Node mà không làm gián đoạn bộ não chỉ huy.')

    # 9 — Core Objects: Compute (Pod, ReplicaSet, Deployment)
    s = d.body(prs, 'Các đối tượng cốt lõi: Tầng Tính toán (Compute)', '03 / ĐỐI TƯỢNG K8S')
    for i, (title, detail) in enumerate([
        ('Pod (Đơn vị cơ bản)', '• Đơn vị nhỏ nhất trong K8s\n• Chứa 1 hoặc nhóm container\n• Chia sẻ chung IP nội bộ\n• Chia sẻ chung Storage Volume\n• Vòng đời ngắn hạn (Ephemeral)'),
        ('ReplicaSet (Bản sao)', '• Đảm bảo số lượng Pod mong muốn\n• Ví dụ: Luôn giữ 3 Pods Web chạy\n• Nếu 1 Pod bị lỗi, tạo ngay Pod mới\n• Nếu thừa Pods, tự động tiêu hủy\n• Được quản lý bởi Deployment'),
        ('Deployment (Phát hành)', '• Quản lý phát hành Declarative\n• Hỗ trợ Rolling Update 0 downtime\n• Cho phép Rollback tức thì khi có sự cố\n• Tạm dừng / Tiếp tục cập nhật\n• Đối tượng phổ biến nhất cho web app')
    ]):
        x = 0.72 + i * 3.98
        card(s, x, 1.88, 3.75, 4.05, title, detail, size=14.5, title_size=19)
    takeaway(s, 'Deployment cung cấp năng lực triển khai phiên bản mới hoàn toàn tự động và an toàn tuyệt đối.')

    # 10 — Core Objects: Network & Storage
    s = d.body(prs, 'Các đối tượng cốt lõi: Mạng & Lưu trữ dữ liệu', '03 / ĐỐI TƯỢNG K8S')
    for i, (title, detail) in enumerate([
        ('Service (Mạng ổn định)', '• Cung cấp Virtual IP & DNS cố định\n• Cân bằng tải tự động giữa các Pods\n• ClusterIP: Giao tiếp nội bộ cụm\n• NodePort / LoadBalancer: Ra ngoài'),
        ('Ingress (Cổng HTTP/S)', '• Cổng định tuyến tầng 7 (L7 Routing)\n• Định tuyến theo host & URL path\n• Quản lý chứng chỉ TLS/SSL tập trung\n• Thay thế Nginx Gateway bên ngoài'),
        ('ConfigMap & Secret', '• Tách biệt cấu hình khỏi Docker image\n• ConfigMap: Khai báo cổng, URL, mode\n• Secret: Mã hóa Base64 cho mật khẩu, token bảo mật, khóa ký JWT'),
        ('PV & PVC (Lưu trữ)', '• PersistentVolume: Ổ đĩa hạ tầng cấp\n• PersistentVolumeClaim: Yêu cầu của Pod\n• Dữ liệu tồn tại vĩnh viễn khi Pod chết\n• Hỗ trợ ReadWriteOnce, ReadWriteMany')
    ]):
        x, y = 0.8 + (i % 2) * 6.05, 1.88 + (i // 2) * 2.05
        card(s, x, y, 5.65, 1.95, title, detail, size=14, title_size=19)
    takeaway(s, 'Mạng và lưu trữ trong K8s được trừu tượng hóa, giúp ứng dụng không phụ thuộc vào máy chủ vật lý cụ thể.')

    # 11 — Self-Healing & Autoscaling
    s = d.body(prs, 'Năng lực Đột phá: Tự phục hồi & Tự co giãn', '03 / TÍNH NĂNG K8S')
    card(s, 0.8, 1.88, 5.6, 4.05, 'Tự phục hồi (Self-Healing)',
         '• Liveness Probe: Kiểm tra container có bị treo (Deadlock) không. Nếu có, K8s tự động khởi động lại.\n• Readiness Probe: Kiểm tra ứng dụng đã nạp xong DB chưa. Chỉ cấp phát traffic khi probe báo sẵn sàng.\n• Node Failure Eviction: Khi một máy chủ vật lý sập nguồn, K8s tự động di chuyển toàn bộ Pods sang máy chủ khác còn sống.', size=15)
    card(s, 6.9, 1.88, 5.6, 4.05, 'Tự co giãn (Autoscaling)',
         '• Horizontal Pod Autoscaler (HPA): Tự động tăng số lượng Pods từ 2 lên 10 khi CPU vượt 70% hoặc lượng request tăng đột biến.\n• Vertical Pod Autoscaler (VPA): Tự động điều chỉnh kích thước CPU/RAM cho Pod.\n• Cluster Autoscaler: Tự động bổ sung máy chủ mới vào cụm khi thiếu tài nguyên và tắt bớt khi vắng khách.', size=15)
    takeaway(s, 'K8s biến hạ tầng phần mềm thành hệ thống thông minh, tự thích ứng với biến động người dùng.')

    # 12 — Comparison Table
    s = d.body(prs, 'So sánh đối chiếu: Docker Compose vs Kubernetes', '04 / SO SÁNH ĐỐI CHIẾU')
    headers = ['Tiêu chí', 'Docker Compose', 'Kubernetes (K8s)']
    rows = [
        ['Phạm vi quản lý', 'Single-Host (1 máy chủ duy nhất)', 'Multi-Node Cluster (cụm máy chủ)'],
        ['Độ phức tạp', 'Rất thấp · 1 file YAML · Dễ học', 'Cao · Nhiều đối tượng & kiến trúc'],
        ['Khả năng mở rộng', 'Thủ công trên giới hạn 1 máy', 'Tự động (HPA) không giới hạn máy'],
        ['Cơ chế tự chữa lành', 'Khởi động lại container (restart)', 'Tự dời Pod khi máy chủ vật lý chết'],
        ['Cân bằng tải', 'Cơ bản (thường cần Nginx ngoài)', 'Tích hợp sẵn (Service + Ingress)'],
        ['Cập nhật phiên bản', 'Dừng/Bật lại container (downtime)', 'Rolling Update & Rollback tức thì']
    ]
    table_shape = s.shapes.add_table(7, 3, Inches(0.8), Inches(1.85), Inches(11.7), Inches(4.1))
    table = table_shape.table
    table.columns[0].width = Inches(2.7)
    table.columns[1].width = Inches(4.5)
    table.columns[2].width = Inches(4.5)
    for col_idx, h_text in enumerate(headers):
        cell = table.cell(0, col_idx)
        cell.text = h_text
        p = cell.text_frame.paragraphs[0]
        p.font.name = 'Arial'
        p.font.size = d.Pt(16)
        p.font.bold = True
        p.font.color.rgb = d.RGBColor.from_string(d.WHITE)
        cell.fill.solid()
        cell.fill.fore_color.rgb = d.RGBColor.from_string(d.NAVY)
    for row_idx, row_data in enumerate(rows):
        for col_idx, val in enumerate(row_data):
            cell = table.cell(row_idx + 1, col_idx)
            cell.text = val
            p = cell.text_frame.paragraphs[0]
            p.font.name = 'Arial'
            p.font.size = d.Pt(14)
            p.font.bold = (col_idx == 0)
            cell.fill.solid()
            bg = d.CYAN if row_idx % 2 == 0 else d.WHITE
            cell.fill.fore_color.rgb = d.RGBColor.from_string(bg)
    takeaway(s, 'Không có công cụ nào "tốt hơn", chỉ có công cụ nào "phù hợp hơn" với bài toán cụ thể.')

    # 13 — When to use which
    s = d.body(prs, 'Chiến lược Lựa chọn Công nghệ trong Thực tế', '04 / QUYẾT ĐỊNH KỸ THUẬT')
    card(s, 0.8, 1.88, 5.6, 4.05, 'Khi nào chọn Docker Compose?',
         '• Môi trường lập trình cá nhân (Local Development)\n• Môi trường kiểm thử nội bộ (Staging, Test, QA)\n• Hệ thống nội bộ, ứng dụng Monolith hoặc Microservices nhỏ\n• Ngân sách hạ tầng hạn chế, đội ngũ vận hành nhỏ gọn\n• Dự án cần tốc độ phát triển và triển khai nhanh nhất', size=15)
    card(s, 6.9, 1.88, 5.6, 4.05, 'Khi nào chọn Kubernetes (K8s)?',
         '• Môi trường Production lớn, lưu lượng truy cập hàng triệu người\n• Hệ sinh thái nhiều vi dịch vụ độc lập của nhiều đội ngũ\n• Yêu cầu tính sẵn sàng liên tục 99.99% (High Availability)\n• Cần tự động co giãn tài nguyên theo mùa vụ/giờ cao điểm\n• Triển khai đa đám mây (Multi-cloud: AWS, GCP, Azure)', size=15)
    takeaway(s, 'Mô hình chuẩn của doanh nghiệp hiện đại: Lập trình bằng Compose, Vận hành bằng K8s.')

    # 14 — Practical JobLink Docker Compose Architecture
    s = d.body(prs, 'Thực tế Dự án JobLink: Nền tảng Docker Compose', '05 / THỰC TẾ JOBLINK')
    card(s, 0.8, 1.88, 5.6, 4.05, 'Hệ sinh thái 4 tầng Ứng dụng',
         '• Nginx Gateway (:8088): Rate-limit, bảo vệ biên an toàn\n• Web / Express (:3000): Node 22, Non-root, /metrics nội tại\n• AI Service (:5000): Python 3.11 Gunicorn WSGI đa luồng\n• MySQL 8.0 (:3306): InnoDB utf8mb4, Named Volume bảo toàn\n• Quản lý toàn bộ chỉ trong tệp docker-compose.yml duy nhất', size=15)
    card(s, 6.9, 1.88, 5.6, 4.05, 'Mở rộng 9 Container DevOps',
         '• Jenkins CI/CD (:8080): Tự động hóa Pipeline 8 bước\n• Prometheus (:9090): Giám sát 10 targets & 5 alert rules\n• Grafana (:3001): Trực quan hóa qua 13 panels theo dõi\n• Alertmanager (:9093): Điều phối cảnh báo tức thì\n• Đã kiểm định thực tế 16/16 smoke checks & 11/11 monitor checks', size=15)
    takeaway(s, 'JobLink đã hoàn thiện xuất sắc trên Docker Compose, tạo bàn đạp vững chắc để chuyển dịch lên K8s.')

    # 15 — Ready for K8s: JobLink Manifests
    s = d.body(prs, 'Sẵn sàng lên K8s: Bộ Manifests thực chiến cho JobLink', '05 / THỰC TẾ JOBLINK')
    for i, (title, detail) in enumerate([
        ('k8s/namespace & config', '• Namespace: joblink cô lập hoàn toàn\n• ConfigMap: Khai báo cổng, mode, URL\n• Secret: Khóa bí mật JWT, Token AI, DB pass'),
        ('k8s/mysql.yaml', '• PersistentVolumeClaim: 10Gi lưu trữ\n• Deployment MySQL 8.0 ổn định\n• Service ClusterIP :3306 bảo mật nội bộ'),
        ('k8s/ai & web.yaml', '• Deployments 2 bản sao (Replicas: 2)\n• Readiness & Liveness probes qua /ready & /health\n• RollingUpdate maxUnavailable: 0'),
        ('k8s/ingress & hpa.yaml', '• Ingress Controller: Routing / và rate-limit\n• HPA Web: Tự co giãn từ 2 lên 6 Pods\n• HPA AI: Tự co giãn từ 2 lên 4 Pods')
    ]):
        x, y = 0.8 + (i % 2) * 6.05, 1.88 + (i // 2) * 2.05
        card(s, x, y, 5.65, 1.95, title, detail, size=14, title_size=19)
    takeaway(s, 'Nhóm đã chuẩn bị sẵn bộ Manifests đầy đủ, chứng minh tính thực chiến và khả năng đưa JobLink lên Cloud.')

    # 16 — K8s Deployment Workflow & Runbook
    s = d.body(prs, 'Quy trình Triển khai & Vận hành thực tế trên K8s', '05 / THỰC HÀNH TRIỂN KHAI')
    d.command(s, '# 1. Triển khai toàn bộ hệ thống lên cụm K8s chỉ bằng 1 lệnh:\nkubectl apply -f k8s/\n\n# 2. Kiểm tra trạng thái toàn bộ Pods, Services, PVC, Ingress:\nkubectl get all,pvc,ingress,hpa -n joblink\n\n# 3. Theo dõi trạng thái Rolling Update không gián đoạn dịch vụ:\nkubectl rollout status deployment/joblink-web -n joblink', 0.8, 1.9, 11.7, 3.9, size=18)
    takeaway(s, 'Toàn bộ quy trình có thể tích hợp trực tiếp vào Jenkins Pipeline để tạo luồng GitOps hoàn chỉnh.')

    # 17 — Summary & Closing
    s = d.body(prs, 'Tổng kết & Định hướng Phát triển', 'KẾT LUẬN / BÀI TẬP NHÓM')
    card(s, 0.8, 1.88, 5.6, 4.05, 'Kết quả đạt được',
         '• Nắm vững kiến trúc, nguyên lý của Docker Compose và K8s\n• So sánh đối chiếu toàn diện 6 tiêu chí kỹ thuật cốt lõi\n• Hiểu rõ khi nào nên dùng Compose, khi nào nên chọn K8s\n• Làm chủ kiến trúc multi-container thực tế của JobLink\n• Hoàn thiện bộ Manifests K8s sẵn sàng cho Production phân tán', size=15)
    card(s, 6.9, 1.88, 5.6, 4.05, 'Thông điệp kết thúc',
         'Docker Compose và Kubernetes không đối đầu nhau, mà là hai mảnh ghép bổ trợ hoàn hảo trong hành trình công nghệ:\n\n"Bắt đầu tinh gọn với Compose, Vững vàng vươn tầm cùng Kubernetes."\n\nXin trân trọng cảm ơn Thầy và các bạn đã lắng nghe!', size=15)
    takeaway(s, 'Nhóm 02 kính mời Thầy và các bạn đặt câu hỏi vấn đáp!')

    assert len(prs.slides) == TOTAL
    output = ROOT / 'JobLink_DockerCompose_K8s_Presentation.pptx'
    temp = output.with_suffix('.tmp.pptx')
    prs.save(temp)
    temp.replace(output)
    print(f'Successfully created {len(prs.slides)} slides: {output}')


if __name__ == '__main__':
    create_deck()
