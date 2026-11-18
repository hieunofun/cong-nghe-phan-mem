# Kịch bản Báo cáo & Bộ câu hỏi Vấn đáp (Q&A)
## Chuyên đề: Tìm hiểu & Triển khai Docker Compose & Kubernetes (K8s)
**Học phần:** INFO3004 — Triển khai phần mềm  
**Đơn vị:** Trường Đại học CMC · Lớp 24IT3 · Nhóm 02  
**Giảng viên hướng dẫn:** Đặng Quốc Hữu  
**Ngày báo cáo:** 19/11/2026  
**Tài liệu slide:** [JobLink_DockerCompose_K8s_Presentation.pptx](JobLink_DockerCompose_K8s_Presentation.pptx) (17 slides)  
**Thư mục Manifests thực hành:** [k8s/](k8s/)

---

## PHẦN 1: PHÂN CÔNG THUYẾT TRÌNH CHO 6 THÀNH VIÊN (15–18 PHÚT)

| STT | Thành viên | Slide phụ trách | Nội dung chính | Thời lượng gợi ý |
|---|---|---|---|---|
| 1 | **Phan Văn Hiếu** (Trưởng nhóm) | Slide 1 – 3 | Mở đầu, giới thiệu nhóm, đặt vấn đề: Thách thức khi dùng container đơn lẻ (`docker run`) và nhu cầu tất yếu của Container Orchestration. | 2.5 phút |
| 2 | **Nguyễn Doãn Huy** | Slide 4 – 6 | Tổng quan về Docker Compose: Bản chất IaC, phân tích 4 trụ cột trong `docker-compose.yml` (`services`, `networks`, `volumes`, `depends_on`), ưu điểm và giới hạn trên Production. | 3 phút |
| 3 | **Nguyễn Trần Tuấn Khôi** | Slide 7 – 8 | Giới thiệu Kubernetes (K8s): Nguồn gốc từ Google, triết lý "Desired State" (Reconciliation Loop), kiến trúc phân tầng Control Plane (Master) và Worker Nodes. | 3 phút |
| 4 | **Trần Đức Nguyên** | Slide 9 – 11 | Các đối tượng K8s cốt lõi (Pod, Deployment, Service, Ingress, ConfigMap/Secret, PVC) và 2 cơ chế đột phá: Tự phục hồi (Self-Healing) & Tự co giãn (Autoscaling - HPA). | 3.5 phút |
| 5 | **Niê Phương Anh** | Slide 12 – 13 | Bảng so sánh đối chiếu đa chiều giữa Docker Compose vs Kubernetes trên 6 tiêu chí kỹ thuật và chiến lược quyết định công nghệ trong thực tế doanh nghiệp. | 2.5 phút |
| 6 | **Nguyễn Quang Trung** | Slide 14 – 17 | Minh chứng thực tế từ dự án JobLink (kiến trúc Compose hiện tại), trình diễn bộ Manifests K8s (`k8s/`), quy trình triển khai `kubectl`, tổng kết và dẫn dắt Q&A. | 3.5 phút |

---

## PHẦN 2: LỜI THOẠI MẪU CHO TỪNG THÀNH VIÊN

### 1. Phan Văn Hiếu (Slide 1 – 3): Đặt vấn đề & Nhu cầu Orchestration
> *"Kính thưa Thầy và các bạn, hôm nay Nhóm 02 xin phép trình bày bài tập tuần về chủ đề: **Tìm hiểu và Triển khai Docker Compose & Kubernetes (K8s)**.  
> Trong thực tế, khi mới làm quen với Docker, chúng ta thường chạy các container bằng lệnh `docker run`. Nhưng khi một hệ thống thực tế mở rộng gồm Web, AI, Database và Gateway, việc gõ lệnh thủ công bộc lộ những điểm yếu chí mạng: khó nhớ tham số, dễ quên mount ổ đĩa làm mất dữ liệu, và không kiểm soát được việc Web khởi động trước khi Database sẵn sàng.  
> Để giải quyết bài toán đó, ngành phần mềm đã chuyển dịch sang **Container Orchestration (Điều phối container)**. Tiếp theo, bạn Huy sẽ phân tích công cụ điều phối quen thuộc nhất: Docker Compose."*

### 2. Nguyễn Doãn Huy (Slide 4 – 6): Docker Compose
> *"Chào Thầy và các bạn, Docker Compose là công cụ chính thức của Docker giúp chúng ta quản lý nhiều container trên cùng một máy chủ vật lý bằng triết lý **Infrastructure as Code (IaC)** thông qua tệp `docker-compose.yml`.  
> File cấu hình này đứng vững trên 4 trụ cột: `services` (khai báo các container), `networks` (mạng ảo nội bộ tự động phân giải DNS theo tên dịch vụ), `volumes` (bảo toàn dữ liệu bền vững khi container khởi động lại), và `depends_on` kết hợp `healthcheck` (đảm bảo dịch vụ phụ thuộc như MySQL phải khỏe mạnh thì Web mới được chạy).  
> Docker Compose cực kỳ tuyệt vời cho máy lập trình viên (Local Dev) và Staging. Tuy nhiên, khi đưa lên Production quy mô lớn, nó gặp điểm nghẽn: chỉ chạy trên **một máy duy nhất (Single-Host)**. Nếu máy đó sập nguồn, toàn bộ hệ thống sẽ chết; đồng thời không thể tự động mở rộng đa máy chủ. Để vượt qua giới hạn này, chúng ta cần bước tiến hóa tiếp theo: Kubernetes, do bạn Khôi trình bày."*

### 3. Nguyễn Trần Tuấn Khôi (Slide 7 – 8): Kubernetes & Kiến trúc Cụm
> *"Tiếp nối phần trình bày của bạn Huy, Kubernetes (hay K8s) là nền tảng điều phối container phân tán nguồn mở khởi nguồn từ hệ thống Borg của Google với hơn 15 năm kinh nghiệm thực chiến.  
> Điểm cốt lõi của K8s nằm ở triết lý **'Desired State' (Trạng thái mong muốn)**: Chúng ta chỉ cần khai báo hệ thống mong muốn có bao nhiêu bản sao, K8s sẽ liên tục giám sát trạng thái thực tế và tự động sửa chữa nếu có sai lệch.  
> Về mặt kiến trúc, K8s chia làm 2 tầng rõ rệt: **Control Plane (Master Node)** đóng vai trò bộ não chỉ huy (gồm `kube-apiserver` tiếp nhận lệnh, `etcd` lưu trạng thái, `kube-scheduler` phân bổ Pod, và `kube-controller-manager` điều hành vòng đời); và **Worker Nodes** là các máy công nhân thực thi (gồm `kubelet` nhận lệnh, `kube-proxy` định tuyến mạng, và Container Runtime nơi các Pod thực sự vận hành). Tiếp theo, bạn Nguyên sẽ giới thiệu các đối tượng cốt lõi trong K8s."*

### 4. Trần Đức Nguyên (Slide 9 – 11): Đối tượng K8s, Self-Healing & Autoscaling
> *"Trong Kubernetes, chúng ta làm việc thông qua các đối tượng tài nguyên được chuẩn hóa.  
> Về tính toán, đơn vị nhỏ nhất không phải là container mà là **Pod**; các Pod được quản lý bởi **Deployment** để thực hiện cập nhật phiên bản mới theo cơ chế **Rolling Update** mà không gây gián đoạn dịch vụ (Zero Downtime).  
> Về mạng và lưu trữ, **Service** cung cấp Virtual IP ổn định để cân bằng tải; **Ingress** đóng vai trò cổng định tuyến HTTP/HTTPS tầng 7; **ConfigMap & Secret** tách rời cấu hình và mật khẩu khỏi image; còn **PV và PVC** giúp bảo toàn dữ liệu vĩnh viễn độc lập với vòng đời của Pod.  
> Đặc biệt, K8s sở hữu hai năng lực đột phá: **Self-Healing** (tự động phát hiện container treo qua Liveness Probe hoặc tự dời Pod sang Node khác khi máy chủ sập); và **Autoscaling** qua HPA (tự động tăng từ 2 lên 10 Pods khi lượng truy cập đột biến). Sau đây, bạn Phương Anh sẽ so sánh chi tiết giữa Compose và K8s."*

### 5. Niê Phương Anh (Slide 12 – 13): Bảng so sánh & Chiến lược Lựa chọn
> *"Kính thưa Thầy, để có cái nhìn tổng quan nhất, nhóm em đã xây dựng bảng đối chiếu giữa Docker Compose và Kubernetes trên 6 tiêu chí:  
> 1. Về phạm vi: Compose chỉ chạy trên 1 Host duy nhất, còn K8s quản lý cụm phân tán Multi-Node.  
> 2. Về độ phức tạp: Compose rất dễ học, chỉ cần 1 file YAML; K8s có độ phức tạp cao hơn rất nhiều.  
> 3. Về mở rộng & tự chữa lành: Compose mở rộng thủ công trên 1 máy; K8s tự động co giãn bằng HPA và tự dời Pod khi máy chủ vật lý gặp sự cố.  
> 4. Về cân bằng tải & phát hành: K8s tích hợp sẵn Ingress và Rolling Update không gián đoạn dịch vụ.  
> Từ đó, chiến lược chuẩn trong doanh nghiệp là: Không phải K8s thay thế hoàn toàn Compose, mà chúng bổ trợ cho nhau: **Sử dụng Docker Compose cho môi trường Lập trình & Kiểm thử nhanh; và sử dụng Kubernetes cho môi trường Production quy mô lớn**. Tiếp theo, bạn Trung sẽ trình bày ứng dụng thực tế trên dự án JobLink của nhóm."*

### 6. Nguyễn Quang Trung (Slide 14 – 17): Thực tế JobLink, Bộ Manifests K8s & Tổng kết
> *"Để chứng minh tính thực chiến, nhóm em đã áp dụng toàn bộ kiến thức trên vào dự án **JobLink**:  
> Hiện tại, JobLink đã vận hành hoàn hảo trên Docker Compose với kiến trúc 4 tầng: Gateway Nginx, Web Node.js, AI Gunicorn và MySQL 8.0, cùng bộ DevOps giám sát toàn diện gồm Jenkins, Prometheus và Grafana.  
> Không dừng lại ở đó, nhóm em đã xây dựng sẵn **bộ Manifests K8s hoàn chỉnh trong thư mục `k8s/`**: gồm `namespace`, `configmap-secret`, `mysql.yaml` với PVC 10Gi, `web.yaml` và `ai.yaml` chạy 2 bản sao kèm liveness/readiness probes, cùng `ingress.yaml` và `hpa.yaml` tự động co giãn từ 2 đến 6 Pods.  
> Quá trình triển khai chỉ cần thực thi duy nhất lệnh `kubectl apply -f k8s/` và có thể tích hợp thẳng vào Jenkins Pipeline.  
> Tóm lại, nhóm 02 đã làm chủ từ kỹ thuật điều phối đơn máy chủ với Compose đến kiến trúc phân tán cụm với Kubernetes. Nhóm em xin chân thành cảm ơn Thầy và các bạn, xin mời Thầy đặt câu hỏi vấn đáp cho nhóm ạ!"*

---

## PHẦN 3: BỘ CÂU HỎI VẤN ĐÁP THƯỜNG GẶP (CHEAT SHEET Q&A CỦA GIẢNG VIÊN)

### Câu 1: Tại sao Docker Compose không phù hợp cho môi trường Production lớn?
* **Trả lời:** Vì Docker Compose chỉ hoạt động trên **một máy chủ vật lý duy nhất (Single Host)**. Khi máy chủ đó gặp sự cố phần cứng, mất mạng hoặc sập nguồn, toàn bộ hệ thống sẽ ngừng hoạt động (Single Point of Failure). Ngoài ra, Compose không có khả năng tự động co giãn (Autoscaling) đa máy chủ, không thể tự phát hiện máy chủ chết để dời container sang máy khác, và không hỗ trợ cơ chế Rolling Update không downtime ở quy mô lớn.

### Câu 2: Trong Kubernetes, tại sao lại dùng "Pod" mà không chạy trực tiếp Container?
* **Trả lời:** Pod là đơn vị trừu tượng hóa nhỏ nhất trong K8s. Một Pod có thể chứa một hoặc một nhóm container có quan hệ mật thiết (mô hình Sidecar). Các container trong cùng một Pod sẽ:
  1. Dùng chung một địa chỉ IP và dải cổng mạng (Network Namespace), có thể gọi nhau qua `localhost`.
  2. Dùng chung các ổ đĩa lưu trữ (Volumes).
  3. Được lập lịch (schedule) chạy trên cùng một máy chủ vật lý (Node). Nếu K8s quản lý container đơn lẻ, việc đồng bộ mạng và ổ đĩa chia sẻ giữa hai container phụ thuộc sẽ cực kỳ phức tạp.

### Câu 3: K8s làm thế nào để cập nhật phiên bản mới mà không làm gián đoạn người dùng (Zero Downtime)?
* **Trả lời:** K8s sử dụng chiến lược **Rolling Update** trong đối tượng `Deployment`. Cụ thể:
  - K8s khởi tạo một Pod mới mang phiên bản mới (ví dụ v2.0).
  - K8s kiểm tra qua `readinessProbe`, chỉ khi Pod mới đã sẵn sàng nhận kết nối thì K8s mới chuyển lưu lượng người dùng sang Pod mới.
  - Sau đó, K8s mới tiến hành tắt dần một Pod phiên bản cũ (v1.0).
  - Quá trình diễn ra từng bước (điều khiển bởi tham số `maxSurge` và `maxUnavailable`) cho đến khi toàn bộ Pods được thay thế, người dùng hoàn toàn không cảm nhận được thời gian chết (0 downtime).

### Câu 4: Phân biệt `ClusterIP`, `NodePort`, `LoadBalancer` và `Ingress`?
* **Trả lời:**
  * **ClusterIP (Mặc định):** Chỉ cấp một IP ảo nội bộ trong cụm K8s. Các service bên trong gọi nhau (VD: Web gọi MySQL/AI), bên ngoài Internet không truy cập được.
  * **NodePort:** Mở một cổng cố định (từ 30000–32767) trên tất cả các Worker Node để truy cập từ ngoài vào qua `<NodeIP>:<NodePort>`.
  * **LoadBalancer:** Tích hợp với Cloud Provider (AWS, GCP, Azure) để cấp phát một IP công khai thực sự kèm bộ cân bằng tải phần cứng.
  * **Ingress:** Cổng định tuyến tầng 7 (HTTP/HTTPS) đứng trước các Service. Ingress cho phép định tuyến dựa trên tên miền (`host`) và đường dẫn (`path`), đồng thời quản lý chứng chỉ SSL/TLS tập trung, giúp tiết kiệm chi phí vì nhiều service có thể dùng chung một LoadBalancer.

### Câu 5: `ConfigMap` và `Secret` khác nhau ở điểm nào? Secret có an toàn tuyệt đối không?
* **Trả lời:**
  * `ConfigMap` dùng để chứa cấu hình không nhạy cảm (cổng mạng, URL API, môi trường `NODE_ENV`).
  * `Secret` dùng để chứa thông tin nhạy cảm (mật khẩu database, khóa bí mật JWT, token API).
  * Mặc định trong K8s, Secret chỉ được mã hóa dạng **Base64** (dễ dàng decode lại), vì vậy nó **chưa an toàn tuyệt đối** nếu chỉ lưu mặc định trong `etcd`. Trong môi trường Production thực tế, doanh nghiệp cần kết hợp thêm: Mã hóa tầng lưu trữ (Encryption at Rest trong etcd), phân quyền RBAC chặt chẽ, hoặc tích hợp các công cụ quản lý khóa chuyên dụng như **HashiCorp Vault** hoặc **AWS Secrets Manager**.

### Câu 6: Dữ liệu cơ sở dữ liệu MySQL có bị mất khi Pod bị xóa hoặc Node bị chết không?
* **Trả lời:** Không, vì dữ liệu được lưu trữ trên **PersistentVolume (PV)** thông qua **PersistentVolumeClaim (PVC)**. PV là vùng lưu trữ độc lập hoàn toàn với vòng đời của Pod (nằm trên SAN, NAS, AWS EBS hoặc NFS). Khi một Pod MySQL bị xóa hoặc dời sang Node khác, Pod mới khởi tạo sẽ tự động gắn (mount) lại đúng PVC đó, do đó toàn bộ bảng và dữ liệu MySQL được bảo toàn nguyên vẹn.

### Câu 7: Phân biệt `livenessProbe` và `readinessProbe`?
* **Trả lời:**
  * **Liveness Probe:** Kiểm tra xem container có đang "sống" hay không. Nếu probe thất bại (ví dụ ứng dụng bị deadlock, loop vô tận), K8s sẽ **tiêu diệt và khởi động lại container**.
  * **Readiness Probe:** Kiểm tra xem ứng dụng đã "sẵn sàng nhận request" hay chưa (ví dụ: đã nạp xong bộ nhớ, đã kết nối xong CSDL chưa). Nếu probe thất bại, K8s **tạm thời ngắt luồng traffic** không gửi request đến Pod đó nữa, nhưng không khởi động lại container.

### Câu 8: `Horizontal Pod Autoscaler` (HPA) hoạt động như thế nào khi quá tải?
* **Trả lời:** HPA định kỳ (mặc định 15 giây/lần) truy vấn số liệu sử dụng tài nguyên (thông qua `metrics-server`). Nếu chỉ số CPU hoặc RAM trung bình của các Pod vượt quá ngưỡng quy định (ví dụ 70% trong `k8s/hpa.yaml`), HPA sẽ tự động tính toán và gọi API của Deployment để tăng số lượng bản sao (`replicas`) từ mức tối thiểu (ví dụ 2 Pods) lên tối đa (ví dụ 6 Pods). Khi lưu lượng giảm trở lại, HPA sẽ giảm dần số lượng Pods về mức ban đầu để tiết kiệm tài nguyên.

### Câu 9: Trong dự án JobLink, nếu chuyển dịch từ Docker Compose sang K8s thì tầng Nginx Gateway giải quyết thế nào?
* **Trả lời:** Có hai phương án tiếp cận:
  1. **Phương án Cloud Native (Khuyên dùng):** Thay thế container `joblink-gateway` bằng **Nginx Ingress Controller** của Kubernetes. Mọi chức năng như rate-limit, nén Gzip, định tuyến đường dẫn đều được khai báo qua Annotation trong file `k8s/ingress.yaml`.
  2. **Phương án Hybrid (Bảo toàn kiến trúc):** Vẫn giữ `joblink-gateway` đóng gói dưới dạng một Deployment trong K8s để làm Reverse Proxy tầng ứng dụng, đứng sau Ingress hoặc Service LoadBalancer.

### Câu 10: Nếu một Worker Node trong cụm bị đứt cáp mạng hoặc sập nguồn vật lý hoàn toàn, Kubernetes xử lý ra sao?
* **Trả lời:** 
  1. `kube-controller-manager` (cụ thể là Node Lifecycle Controller) sẽ liên tục kiểm tra tín hiệu heartbeat từ `kubelet` của Node đó.
  2. Nếu sau một khoảng thời gian (mặc định 40 giây không có tín hiệu và sau 5 phút `pod-eviction-timeout`), Master sẽ đánh dấu Node đó ở trạng thái `NotReady`.
  3. K8s sẽ kích hoạt cơ chế **Eviction**: Tự động tạo lại toàn bộ các Pod bị mất trên các Worker Node khỏe mạnh khác trong cụm để đảm bảo số lượng bản sao (`replicas`) khai báo trong Deployment luôn được duy trì đủ.
