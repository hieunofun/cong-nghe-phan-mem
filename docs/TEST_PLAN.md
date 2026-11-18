# Testing & Verification Plan

## 1. Automated Unit, Security & Regression Suite (`64 Tests`)

Run the complete Node.js test suite:

```bash
npm test
```

Current result: **64/64 PASS** (`0` failures) across 14 test files:
- **DevOps & Production Hardening (`tests/devops-final-hardening.test.js`):** Verifies non-root Dockerfiles (`USER node` / `USER appuser`), `NODE_ENV=production`, Gunicorn WSGI, Compose log rotation, Nginx rate-limiting and `/metrics` shielding, Prometheus/Alertmanager/Grafana 13-panel provisioning, 8-stage `Jenkinsfile`, OAuth MySQL schema unification, SHA-256 backup helpers, security headers, `/metrics` exposition, and `/internal/alert-webhook` Alertmanager sink.
- **Webhook Security (`tests/github-webhook.test.js`):** Verifies HMAC-SHA256 signature validation, tampered payload rejection (`403`), branch/repo filtering, replay deduplication, retryable `503` handling, and isolation of Jenkins admin routes.
- **Application Lifecycle, Auto-Apply & Bilingual AI (`tests/candidate-lifecycle.test.js`, `tests/auto-apply.test.js`, `tests/chatbot-multilingual-ai.test.js`):** Verifies CV snapshot immutability, status history audit trail, opt-in AI auto-apply thresholds, and Vietnamese–English CV extraction/matching.
- **Auth, Cloud & Release Regressions (`tests/auth-enhancements.test.js`, `tests/postgres-connection.test.js`, `tests/ai-service-client.test.js`, `tests/production-regressions.test.js`, `tests/split-deployment.test.js`, `tests/release-evidence.test.js`):** Verifies password policy, single-use SHA-256 reset tokens, PostgreSQL TLS handling, cold-start retries, CORS allowlists, and release artifacts.

## 2. Python AI & Prometheus Rule Unit Tests

```bash
# Python AI multilingual matching & skill normalization (3/3 PASS)
python -m unittest ai_service.test_multilingual_matching

# Dependency vulnerability audit (0 vulnerabilities)
npm audit

# Prometheus alert rule unit tests (Blackbox + White-box memory rules)
docker run --rm --entrypoint promtool \
  -v "$PWD/devops/monitoring:/etc/prometheus:ro" \
  prom/prometheus:v3.15.1 test rules /etc/prometheus/alerts.test.yml
```

## 3. Post-Deployment Docker Smoke Suite (`16/16 Checks`)

Executed automatically in Stage 8 of `Jenkinsfile` and via `node scripts/docker-check.js`:
1. Web `/health` liveness & HTTP security headers (`nosniff`, `SAMEORIGIN`, hidden `X-Powered-By`)
2. Database readiness probe (`/ready` `SELECT 1`)
3. Static home page & frontend runtime environment config
4. MySQL UTF-8 Vietnamese seeded jobs, keyword search & category filtering
5. Admin authentication & `/api/auth/me` RBAC
6. Company authentication & `/api/auth/me` RBAC
7. Candidate authentication & `/api/auth/me` RBAC
8. Production `forgot-password` token leak prevention (`reset_url` omitted)
9. Admin dashboard statistics API
10. Company job management & applicant pipeline stats
11. Candidate profile, applications & saved jobs APIs
12. Web → AI internal token-authenticated health bridge
13. AI Chatbot RAG + live MySQL job retrieval
14. AI CV matching, job recommendations & CV analysis
15. White-box Prometheus `/metrics` endpoint validation
16. Nginx Reverse Proxy Gateway (`:8088`) routing + external `403` blocking of `/metrics` & `/internal/*`

## 4. Full-Stack Observability & Chaos Recovery Verification (`11/11 Checks`)

- `node scripts/monitoring-check.js`: Confirms all **5 Blackbox probes UP**, **10/10 Prometheus scrape targets UP** (including white-box `joblink-web-metrics` and `joblink-ai-metrics`), **5/5 alert rules healthy**, **Alertmanager ready**, and **13-panel Grafana dashboard provisioned**.
- `node scripts/verify-alert-recovery.js`: Stops `joblink-ai`, verifies `JobLinkServiceDown` transitions to `FIRING` and Alertmanager delivers `[FIRING]` webhook notification, restarts `joblink-ai`, and verifies automatic `RESOLVED` webhook delivery.
