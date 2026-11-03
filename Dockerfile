# =============================================================
# Dockerfile cho Nền tảng Tuyển dụng JobLink (Node.js Backend & Web)
# =============================================================
FROM node:22-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy danh sách thư viện và cài đặt trước để tận dụng cache
COPY package*.json ./
RUN npm ci --omit=dev

# Copy toàn bộ mã nguồn
COPY . .

# Đảm bảo các thư mục upload tồn tại và phân quyền ghi
RUN mkdir -p uploads/cv uploads/avatars uploads/logos

# Cổng ứng dụng
EXPOSE 3000

# Biến môi trường mặc định (chạy với MySQL local/Docker)
ENV NODE_ENV=development \
    PORT=3000

# Khởi chạy qua script kiểm tra MySQL và tự động seed dữ liệu
CMD ["node", "scripts/docker-start.js"]
