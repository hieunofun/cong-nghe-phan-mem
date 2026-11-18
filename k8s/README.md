# Kiến trúc Kubernetes (K8s) cho Dự án JobLink

Tài liệu này mô tả cách chuyển dịch hệ thống JobLink từ môi trường đơn máy chủ (**Docker Compose**) sang môi trường phân tán cụm (**Kubernetes Cluster**).

---

## 1. Bảng đối chiếu ánh xạ (Mapping) từ Docker Compose sang Kubernetes

| Thành phần trong Docker Compose | Đối tượng tương đương trong Kubernetes | Tệp Manifest tương ứng |
|---|---|---|
| Không gian chạy dự án | `Namespace` (`joblink`) | `k8s/namespace.yaml` |
| Biến môi trường (`.env`, `environment`) | `ConfigMap` & `Secret` | `k8s/configmap-secret.yaml` |
| Named volume (`joblink_mysql_data`) | `PersistentVolumeClaim` (PVC) | `k8s/mysql.yaml` |
| Named volume (`joblink_uploads_data`) | `PersistentVolumeClaim` (PVC `ReadWriteMany`) | `k8s/web.yaml` |
| Dịch vụ `mysql` | `Deployment` + `Service` (`ClusterIP:3306`) | `k8s/mysql.yaml` |
| Dịch vụ `ai` (Gunicorn WSGI) | `Deployment` (2 Pods) + `Service` (`ClusterIP:5000`) | `k8s/ai.yaml` |
| Dịch vụ `web` (Express) | `Deployment` (RollingUpdate) + `Service` (`ClusterIP:3000`) | `k8s/web.yaml` |
| Dịch vụ `gateway` (Nginx :8088) | `Ingress Controller` (Nginx Ingress) | `k8s/ingress.yaml` |
| Không có trong Compose | `HorizontalPodAutoscaler` (HPA: Tự động co giãn 2–6 Pods) | `k8s/hpa.yaml` |

---

## 2. Quy trình triển khai trên cụm K8s (Runbook)

### Bước 1: Tạo Namespace cô lập
```bash
kubectl apply -f k8s/namespace.yaml
```

### Bước 2: Nạp cấu hình & Bí mật bảo mật
```bash
kubectl apply -f k8s/configmap-secret.yaml
```

### Bước 3: Triển khai tầng Cơ sở dữ liệu (MySQL 8.0)
```bash
kubectl apply -f k8s/mysql.yaml
kubectl rollout status deployment/joblink-mysql -n joblink
```

### Bước 4: Triển khai các dịch vụ ứng dụng (AI & Web)
```bash
kubectl apply -f k8s/ai.yaml
kubectl apply -f k8s/web.yaml
kubectl rollout status deployment/joblink-ai -n joblink
kubectl rollout status deployment/joblink-web -n joblink
```

### Bước 5: Kích hoạt Ingress & Tự động co giãn (HPA)
```bash
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
```

---

## 3. Các lệnh kiểm tra & Vận hành thực tế

* **Kiểm tra trạng thái toàn bộ tài nguyên:**
  ```bash
  kubectl get all -n joblink
  kubectl get pvc,ingress,hpa -n joblink
  ```

* **Kiểm tra nhật ký ghi log của Web và AI:**
  ```bash
  kubectl logs -l app=joblink-web -n joblink -f
  kubectl logs -l app=joblink-ai -n joblink -f
  ```

* **Mô phỏng Rolling Update (Cập nhật không gián đoạn dịch vụ):**
  ```bash
  kubectl set image deployment/joblink-web web-app=joblink-web:2.0 -n joblink
  kubectl rollout status deployment/joblink-web -n joblink
  ```

* **Mô phỏng Rollback tức thì khi bản cập nhật lỗi:**
  ```bash
  kubectl rollout undo deployment/joblink-web -n joblink
  ```
