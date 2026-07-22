# Changelog

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

