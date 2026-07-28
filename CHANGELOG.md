# Changelog

## v1.0.0 Final - 2026-07-28

### Summary

JobLink v1.0.0 is the final course-submission release. It promotes the v0.2 Beta feature set to a verified production deployment on Render Free and Supabase, adds reliability fixes for real deployment failures, and refreshes release evidence for the three-person team.

### Added

- Render Blueprint for separate `joblink-web` and `joblink-ai` services.
- Supabase PostgreSQL and Storage support for persistent production data and uploads.
- Password recovery, terms/privacy documents, and OAuth provider configuration.
- Production regression tests for Supabase TLS, subscription history, AI URL normalization, and Render cold starts.
- Final-release documentation, contributor evidence, and Issue/PR/release traceability.

### Changed

- Production AI runs in lightweight mode with TF-IDF/skill matching and Groq RAG.
- The browser and Node AI bridge retry transient failures while Render Free services wake.
- Package version advanced from `0.2.0` to `1.0.0`.
- Development dependency lock updated so `npm audit` reports zero known vulnerabilities.

### Fixed

- PR #17: prevented Supabase TLS configuration from being overridden by URL query parameters.
- PR #18: preserved Google and GitHub OAuth secrets across Render Blueprint syncs.
- PR #19: fixed PostgreSQL payment-history enum handling and malformed AI service URLs.
- PR #20: handled temporary non-JSON 502/503 responses during AI cold starts.

### Verification

- `npm test`: 22/22 tests passed on Node.js 20.
- `npm run test:checkout-render`: passed.
- `npm audit`: 0 vulnerabilities.
- GitHub Actions CI for pre-release `main`: https://github.com/hieunofun/cong-nghe-phan-mem/actions/runs/30258010023
- Production smoke test on 2026-07-28:
  - `https://joblink-web.onrender.com/health`: HTTP 200.
  - `https://joblink-web.onrender.com/api/categories`: HTTP 200.
  - `https://joblink-web.onrender.com/api/jobs/featured`: HTTP 200.
  - `https://joblink-ai.onrender.com/health`: HTTP 200.

### Known Issues

- Render Free sleeps after inactivity. The observed first response was about 22 seconds for the web service and 51 seconds for the AI service.
- Production matching uses the lightweight TF-IDF/skill backend; the optional 1 GB Sentence Transformer model is not deployed on the free plan.
- Full browser end-to-end and database-isolated integration suites are not yet automated.
- Render, Supabase, Groq, SMTP, OAuth, and banking features depend on external quotas and correctly configured secrets.

### Evidence

- Final readiness Issue: https://github.com/hieunofun/cong-nghe-phan-mem/issues/21
- Production PRs: #16, #17, #18, #19, #20
- Release notes: `docs/RELEASE_v1.0.0.md`
- Contributors: `CONTRIBUTORS.md`

## v0.2 Beta - 2026-07-15

### Summary

JobLink v0.2 Beta is the first integrated beta release of the recruitment platform. It includes role-based dashboards, candidate and employer workflows, job search with filters and pagination, AI chatbot, resume ranking, recommendation, API documentation, deployment notes, CI, and release evidence.

### Added

- AI Chatbot:
  - Frontend chatbot widget.
  - Node endpoint `POST /api/ai/chat`.
  - Flask AI endpoint `POST /chat`.
  - Groq RAG support with FAQ fallback.
- Resume Ranking:
  - `GET /api/ai/match/:jobId`.
  - `GET /api/ai/analyze-cv`.
  - `GET /api/ai/analyze-cv/:candidateId`.
- Recommendation:
  - `GET /api/ai/recommend`.
  - Candidate dashboard recommendation action.
- Candidate Dashboard:
  - Candidate profile update.
  - CV/avatar upload.
  - Applications and saved jobs.
- Employer Dashboard:
  - Company profile update.
  - Job CRUD.
  - Applicant pipeline.
  - CV search.
- Admin Dashboard:
  - System statistics.
  - Company approval.
  - User, job, and category management.
- Search/filter/pagination:
  - Job keyword/category/location/type/salary filters.
  - Job and CV search pagination.
- Documentation:
  - Release notes.
  - API docs.
  - Architecture notes.
  - Deployment notes.
  - User stories and acceptance criteria.
  - Testing plan.
  - Self-assessment.
- CI:
  - GitHub Actions workflow running `npm test`.

### Fixed

- Prevented real `.env` from being committed.
- Added Git LFS tracking for `ai_service/models/cv_job_matching/model.safetensors`.
- Documented AI service offline behavior and deployment boundary.

### Known Issues

- Database-backed integration tests are not fully automated yet.
- Node backend, MySQL, and Flask AI service run as separate processes.
- Uploaded files are stored on local disk for beta.
- OAuth and Groq require environment variables.
- Production deployment needs persistent storage and HTTPS.

### Evidence

- Tag: `v0.2`
- Target commit: `71e3bed382710122ae2c098e2f81ec946f1550bd`
- CI workflow: `.github/workflows/ci.yml`
- Release tests: `tests/release-evidence.test.js`
- Test command: `npm test`

