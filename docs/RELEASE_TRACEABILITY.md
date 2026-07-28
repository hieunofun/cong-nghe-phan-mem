# v1.0.0 Final Release Traceability

This document links release requirements to repository evidence so reviewers can verify the release without relying on external reports.

## Release Metadata

| Field | Value |
|---|---|
| Release | v1.0.0 Final |
| Tag | `v1.0.0` |
| Target commit | Tested `main` merge commit referenced by the `v1.0.0` tag |
| Release date | 2026-07-28 |
| Status | Final / stable |
| Test command | `npm test` |
| CI workflow | `.github/workflows/ci.yml` |
| Readiness tracking | GitHub Issue #21 |

## Requirement to Evidence Matrix

| Requirement | Evidence | Verification |
|---|---|---|
| AI Chatbot hoàn chỉnh | `routes/aiRoutes.js`, `controllers/aiController.js`, `public/js/chatbot-widget.js`, `ai_service/app.py` | `npm test` checks chatbot route; manual test sends a message to `/api/ai/chat`. |
| Resume Ranking | `GET /api/ai/match/:jobId`, `GET /api/ai/analyze-cv`, `ai_service/app.py` | `npm test` checks AI ranking routes; production uses the lightweight TF-IDF and skill backend. |
| Recommendation | `GET /api/ai/recommend`, `public/js/candidate-dashboard.js` | `npm test` checks recommendation route; manual test from candidate dashboard. |
| Dashboard đầy đủ | `public/candidate-dashboard.html`, `public/company-dashboard.html`, `public/admin-dashboard.html` | Manual smoke test in `docs/TEST_PLAN.md`. |
| Candidate Profile | `routes/candidateRoutes.js`, `controllers/candidateController.js` | `npm test` checks profile routes; manual update/upload test. |
| Employer Dashboard | `routes/companyRoutes.js`, `routes/jobRoutes.js`, `public/js/company-dashboard.js` | Manual employer profile/job/applicant tests. |
| Search Filter | `controllers/jobController.js`, `models/jobModel.js`, `public/js/jobs.js` | `npm test` checks query parameters. |
| Pagination | `controllers/jobController.js`, `public/js/jobs.js`, `public/js/cv-search.js` | `npm test` checks `totalPages`; manual page navigation. |
| Notification | `public/js/*.js`, dashboard alert slots | Manual UI smoke test. |
| Performance Optimization | Job search uses pagination/limits; AI recommendation limits candidate job list | Code evidence in `controllers/jobController.js` and `controllers/aiController.js`. |
| Security Improvement | `.gitignore`, `.env.example`, `middleware/auth.js`, `middleware/upload.js` | `npm test` checks config hygiene; code verifies JWT/roles/uploads. |
| Integration Testing | `docs/TEST_PLAN.md` | Manual integration checklist plus CI unit/release tests. |
| API Documentation | `docs/API.md` | Reviewer can map endpoints to routes. |
| Production deployment | `render.yaml`, `RENDER_FREE_DEPLOY.md`, PR #16 | Verify the Render web and AI health endpoints. |
| Supabase TLS | `config/db.js`, PR #17 | Regression tests verify URL SSL parameters cannot override the explicit TLS object. |
| OAuth configuration | `render.yaml`, PR #18 | Regression tests verify provider secret placeholders survive Blueprint sync. |
| Payment and AI production fixes | `models/paymentModel.js`, `services/aiClient.js`, PR #19 | Automated tests verify enum mapping and URL normalization. |
| Render cold-start reliability | `services/aiClient.js`, `public/js/api-client.js`, PR #20 | Automated tests simulate transient failures before a healthy response. |
| Contributors | `CONTRIBUTORS.md` | GitHub handles link to Issue, commit and contributor evidence. |
| Release Notes | `docs/RELEASE_v1.0.0.md`, `CHANGELOG.md` | GitHub Release body is sourced from `docs/RELEASE_v1.0.0.md`. |

## Reviewer Checklist

- Checkout the release tag:

  ```bash
  git fetch --tags
  git checkout v1.0.0
  ```

- Install dependencies:

  ```bash
  npm ci
  ```

- Run automated checks:

  ```bash
  npm test
  ```

- For full manual integration, follow `docs/TEST_PLAN.md`.

## Release Process Notes

Final release work is tracked by Issue #21. The production changes are linked to PR #16–#20, and the release-documentation PR closes the readiness Issue after CI and publication evidence are recorded.

