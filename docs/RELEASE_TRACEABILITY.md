# v0.2 Release Traceability

This document links release requirements to repository evidence so reviewers can verify the release without relying on external reports.

## Release Metadata

| Field | Value |
|---|---|
| Release | v0.2 Beta |
| Tag | `v0.2` |
| Target commit | `71e3bed382710122ae2c098e2f81ec946f1550bd` |
| Release date | 2026-07-15 |
| Status | Beta / prerelease candidate |
| Test command | `npm test` |
| CI workflow | `.github/workflows/ci.yml` |

## Requirement to Evidence Matrix

| Requirement | Evidence | Verification |
|---|---|---|
| AI Chatbot hoàn chỉnh | `routes/aiRoutes.js`, `controllers/aiController.js`, `public/js/chatbot-widget.js`, `ai_service/app.py` | `npm test` checks chatbot route; manual test sends a message to `/api/ai/chat`. |
| Resume Ranking | `GET /api/ai/match/:jobId`, `GET /api/ai/analyze-cv`, `ai_service/models/cv_job_matching/` | `npm test` checks AI ranking routes; manual test requires candidate profile data. |
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
| Release Notes | `docs/RELEASE_v0.2.md`, `CHANGELOG.md` | Release body should copy `docs/RELEASE_v0.2.md`. |

## Reviewer Checklist

- Checkout the release tag:

  ```bash
  git fetch --tags
  git checkout v0.2
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

The release hardening work is documented in this file to make the path from requirement to release evidence visible. For future releases, each row should also be backed by a GitHub Issue and Pull Request before the release is published.

