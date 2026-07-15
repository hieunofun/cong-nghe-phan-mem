# Release v0.2 Beta - JobLink Recruitment Platform

## Release Title

JobLink v0.2 Beta - AI-assisted recruitment platform

## Release Notes

Release v0.2 is the Week 7 Beta milestone for JobLink. This version replaces the early static prototype with an integrated recruitment platform that connects candidates, employers, and administrators through role-based dashboards, job search, candidate profile management, AI chatbot support, resume ranking, and job recommendation.

The release is intended for course evaluation and beta testing. It includes working backend routes, MySQL schema, public frontend pages, an AI service, basic automated tests, API documentation, and deployment notes.

## Features

- AI Chatbot complete enough for beta use:
  - Public chatbot widget is available across main pages.
  - Backend endpoint: `POST /api/ai/chat`.
  - Flask AI service endpoint: `POST /chat`.
  - Uses Groq RAG when `GROQ_API_KEY` is configured and FAQ fallback when Groq is unavailable.
- Resume Ranking:
  - Candidate/job match endpoint: `GET /api/ai/match/:jobId`.
  - Company/admin CV analysis endpoint: `GET /api/ai/analyze-cv/:candidateId`.
  - AI model files are stored under `ai_service/models/`.
- Recommendation:
  - Candidate job recommendation endpoint: `GET /api/ai/recommend`.
  - Candidate dashboard includes a "Tìm việc phù hợp" action.
- Dashboard đầy đủ:
  - Candidate dashboard: profile, CV/avatar upload, applications, saved jobs, AI recommendations.
  - Employer dashboard: company profile, job management, applicant pipeline, package links.
  - Admin dashboard: stats, company approval, user/job/category management.
- Candidate Profile:
  - `GET/PUT /api/candidates/me`.
  - CV upload: `POST /api/candidates/me/cv`.
  - Avatar upload: `POST /api/candidates/me/avatar`.
- Employer Dashboard:
  - `GET/PUT /api/companies/me/profile`.
  - Job CRUD and applicant management.
  - CV search for employers.
- Search Filter:
  - Job search supports keyword, category, location, job type, salary, page, and limit.
  - Frontend filter controls are implemented in `public/jobs.html` and `public/js/jobs.js`.
- Pagination:
  - Job listing pagination is implemented in `/api/jobs` and `public/js/jobs.js`.
  - CV search pagination is implemented in `public/js/cv-search.js`.
- Notification:
  - Frontend alert/notification slots show success and error feedback for login, profile, job, AI, and dashboard flows.
- API Documentation:
  - See `docs/API.md`.

## Enhancements

- Added release documentation for v0.2 Beta.
- Added API documentation with endpoint, role, and payload summary.
- Added deployment notes for Node backend, Flask AI service, MySQL, and Git LFS model files.
- Added basic automated test command with `node --test`.
- Added self-assessment file aligned to the Sommerville 80/20 rubric.
- Improved release evidence for grading: features are mapped to concrete files and endpoints.

## Bug Fixes

- Kept `.env` out of Git to prevent accidental secret leakage.
- Large model file `ai_service/models/cv_job_matching/model.safetensors` is tracked using Git LFS instead of normal Git objects.
- Documented AI offline behavior so the main web app can still run when Flask AI service is not started.
- Documented beta limitations around deployment, external services, and test coverage.

## Known Issues

- No production CI/CD workflow is configured yet.
- Automated tests are basic and focus on release evidence/static verification; database-backed integration tests are still limited.
- MySQL and Flask AI service must be started separately.
- File uploads are stored on local disk under `uploads/`, which is suitable for demo but not ideal for multi-instance production deployment.
- OAuth login requires provider credentials in environment variables.
- Groq-powered chatbot requires `GROQ_API_KEY`; otherwise chatbot uses FAQ/RAG fallback.
- Some AI model files are large and require Git LFS support when cloning.

## Migration Notes

- This release replaces the previous repository content with the JobLink RAG recruitment platform source.
- After pulling v0.2, run `git lfs pull` to download the large AI model file.
- Recreate/update the database from `database/schema.sql`.
- Copy `.env.example` to `.env` locally or configure equivalent environment variables in the deployment platform.
- Do not commit real `.env` values.

## Deployment Notes

1. Install Node dependencies:

   ```bash
   npm install
   ```

2. Create MySQL database and import schema:

   ```bash
   mysql -u <user> -p <database> < database/schema.sql
   ```

3. Seed demo data:

   ```bash
   npm run seed
   ```

4. Start Node backend:

   ```bash
   npm start
   ```

5. Start AI service in another terminal:

   ```bash
   cd ai_service
   pip install -r requirements.txt
   python app.py
   ```

6. Required environment variables:

   - `PORT`
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `JWT_SECRET`
   - `AI_SERVICE_URL`
   - `GROQ_API_KEY` (optional but recommended for chatbot quality)

## Testing Summary

- Basic automated tests added:

  ```bash
  npm test
  ```

- Current test scope:
  - Required release documents exist.
  - Core AI endpoints are registered.
  - Job search exposes filter and pagination parameters.
  - Candidate and employer profile routes exist.
  - `.env` is ignored and `.env.example` is present.
  - Git LFS tracking exists for the large AI model.

- Manual beta checks recommended:
  - Candidate registration/login/profile update.
  - Employer registration/profile/job posting.
  - Admin approval flow.
  - Job search filters and pagination.
  - Chatbot message flow.
  - Recommendation and resume ranking after candidate profile data is available.

