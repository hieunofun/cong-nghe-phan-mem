# Deployment Guide & Topologies

JobLink supports **two production-ready deployment topologies** depending on infrastructure requirements:

1. **Topology A — Containerized DevSecOps Stack (INFO3004 Primary Target):** Full Docker Compose + Nginx Reverse Proxy + Jenkins 8-Stage CI/CD + Prometheus/Grafana/Alertmanager + MySQL 8.0. Detailed runbook: [`FINAL_DEMO.md`](../FINAL_DEMO.md).
2. **Topology B — Managed Cloud Split Deployment:** Express API on Vercel Functions (`bom1`), Static Frontend & Gunicorn AI on Render, and PostgreSQL + Object Storage on Supabase. Detailed runbook: [`VERCEL_RENDER_DEPLOY.md`](../VERCEL_RENDER_DEPLOY.md).

---

## 1. Topology A: Containerized Production Stack (Docker + CI/CD + Observability)

### Services

- **`joblink-gateway` (`nginx:1.27-alpine`, port `127.0.0.1:8088`):** Reverse proxy, Gzip, auth rate-limiting (`10 req/s`), security headers, shields `/metrics` and `/internal/*` from external clients.
- **`joblink-web` (`node:22-alpine`, port `127.0.0.1:3000`):** Runs under `NODE_ENV=production`, `STORAGE_DRIVER=local`, non-root `USER node`, graceful `SIGTERM` shutdown, exposes `/health`, `/ready`, and `/metrics`.
- **`joblink-ai` (`python:3.11-slim`, port `127.0.0.1:5000`):** Runs **Gunicorn WSGI** (`1 worker x 4 threads`) under non-root `USER appuser`, protected by shared `X-JobLink-AI-Token`.
- **`joblink-mysql` (`mysql:8.0`, port `127.0.0.1:3306`):** `utf8mb4` persistence via named volume `joblink_mysql_data`, upgraded safely via idempotent `scripts/apply-mysql-migration.js`.
- **DevOps & Monitoring (`docker-compose.devops.yml`):** `joblink-jenkins` (`:8080`), `joblink-blackbox`, `joblink-prometheus` (`:9090`), `joblink-alertmanager` (`:9093`), and `joblink-grafana` (`:3001`).

### One-Command Startup & Verification

```powershell
npm run devops:up
npm run devops:check
```

### Automated Rollback & Day-2 Backup

- **CI/CD Rollback:** In `Jenkinsfile`, if container rollout or any of the 16 post-deploy smoke checks (`scripts/docker-check.js`) fail, `post.unsuccessful` runs `node scripts/ci-deploy.js rollback` to restore the previous verified `web`, `ai`, and `gateway` image tags automatically while preserving MySQL data.
- **Database Backup & Restore:**
  ```powershell
  npm run db:backup
  npm run db:restore
  ```

---

## 2. Topology B: Managed Cloud Deployment (Vercel + Render + Supabase)

- **Web/API:** Vercel Serverless Function (`vercel.json` in `bom1`) + Render Static Site (`render.yaml`).
- **AI Service:** Render Python Web Service (`gunicorn app:app`) in lightweight TF-IDF + Groq RAG mode.
- **Database & Storage:** Supabase PostgreSQL (Transaction Pooler port `6543`) + Supabase Storage buckets (`joblink-public`, `joblink-cv`).

### Environment Variables

Use `.env.example` as the reference template:
- Core: `NODE_ENV=production`, `PORT`, `JWT_SECRET`, `SESSION_SECRET`, `BASE_URL`, `FRONTEND_URL`, `CORS_ORIGINS`
- Database & Storage: `DB_CLIENT` (`mysql` or `postgres`), `DATABASE_URL` (or `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`), `STORAGE_DRIVER` (`local` for Docker volume, unset for Supabase Storage), `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- AI & Observability: `AI_SERVICE_URL`, `AI_SERVICE_TOKEN`, `GROQ_API_KEY`, `METRICS_TOKEN`, `ALERT_WEBHOOK_TOKEN`, `DISCORD_WEBHOOK_URL`

In `NODE_ENV=production`, password-reset links are never returned in API JSON responses.
