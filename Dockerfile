# =============================================================
# Dockerfile cho Nền tảng Tuyển dụng JobLink (Node.js Backend & Web)
# Production-hardened: Non-root user, NODE_ENV=production, Healthcheck
# =============================================================
FROM node:22-alpine

WORKDIR /app

# Copy danh sách thư viện và cài đặt trước để tận dụng layer cache
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy toàn bộ mã nguồn đã lọc qua .dockerignore
COPY --chown=node:node . .

# Đảm bảo các thư mục upload tồn tại và phân quyền cho non-root user
RUN mkdir -p uploads/cv uploads/avatars uploads/logos \
    && chown -R node:node /app/uploads

EXPOSE 3000

ENV NODE_ENV=production \
    PORT=3000 \
    STORAGE_DRIVER=local

USER node

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=6 \
    CMD node -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "scripts/docker-start.js"]
