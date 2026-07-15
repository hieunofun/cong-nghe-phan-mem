# JobLink v0.2 Beta

## Release Title

JobLink v0.2 Beta - AI-assisted recruitment platform for candidates and employers

## Release Notes

Release v0.2 is the Beta milestone after Week 7. It packages the first integrated version of JobLink as a recruitment web application with three main roles: candidate, employer, and admin.

This release is prepared for course assessment using the Sommerville software engineering rubric. The release evidence maps product value, architecture, reliability, testing, security, DevOps, and documentation to concrete files in the repository.

## Features

- AI Chatbot hoàn chỉnh for beta:
  - Public chatbot widget is loaded on the main pages.
  - Node endpoint: `POST /api/ai/chat`.
  - Flask endpoint: `POST /chat`.
  - Uses Groq RAG when `GROQ_API_KEY` is available and FAQ fallback when not available.
- Resume Ranking:
  - Candidate-to-job match: `GET /api/ai/match/:jobId`.
  - CV analysis: `GET /api/ai/analyze-cv` and `GET /api/ai/analyze-cv/:candidateId`.
  - Local AI model files are under `ai_service/models/`.
- Recommendation:
  - Candidate job recommendation: `GET /api/ai/recommend`.
  - Recommendation UI entry exists in candidate dashboard.
- Dashboard đầy đủ:
  - Candidate dashboard: profile, CV/avatar upload, applications, saved jobs, recommendations.
  - Employer dashboard: company profile, job CRUD, applicant pipeline, CV search.
  - Admin dashboard: statistics, company approval, users, jobs, categories.
- Candidate Profile:
  - View/update candidate profile through `/api/candidates/me`.
  - Upload CV and avatar.
- Employer Dashboard:
  - View/update company profile through `/api/companies/me/profile`.
  - Manage jobs and applicants.
- Search Filter:
  - Job filtering by keyword, category, location, job type, and salary.
  - CV search for employers.
- Pagination:
  - Job search pagination returned by `/api/jobs`.
  - CV search pagination in the employer CV search screen.
- Notification:
  - UI alert slots and error/success messages are used in auth, dashboard, profile, job, payment, and AI flows.
- API Documentation:
  - See `docs/API.md`.

## Enhancements

- Added structured release notes for v0.2 Beta.
- Added `docs/USER_STORIES.md` to connect features to users, scenarios, and acceptance criteria.
- Added `docs/ARCHITECTURE.md` to explain system boundaries and design decisions.
- Added `docs/API.md` for endpoint documentation.
- Added `docs/DEPLOYMENT.md` for local and production deployment notes.
- Added `docs/TEST_PLAN.md` for unit, integration, and manual beta verification.
- Added basic automated release evidence tests through `npm test`.
- Added GitHub Actions workflow to run the basic tests on push and pull request.
- Added `SELF_ASSESSMENT.md` using the 80/20 Sommerville rubric.

## Bug Fixes

- Kept real `.env` out of Git through `.gitignore`.
- Tracked the large `model.safetensors` file with Git LFS instead of regular Git.
- Documented AI offline behavior so testers know the Node web app and Flask AI service are separate processes.
- Documented upload storage limitations and environment variable requirements.

## Known Issues

- Database-backed integration tests are not fully automated yet.
- Node backend, MySQL, and Flask AI service must be started separately.
- File uploads currently use local disk storage under `uploads/`.
- Production deployment still needs persistent upload storage and HTTPS.
- OAuth requires provider credentials before social login can work.
- Groq chatbot quality depends on `GROQ_API_KEY`; without it, FAQ/RAG fallback is more limited.
- Git LFS is required to clone the large AI model file correctly.

## Migration Notes

- This release replaces the earlier static/mobile prototype with the JobLink RAG recruitment platform source.
- After cloning or pulling, run:

  ```bash
  git lfs pull
  ```

- Recreate or update the MySQL database from:

  ```bash
  database/schema.sql
  ```

- Use `.env.example` as the source of required environment variables.
- Do not commit `.env`.

## Deployment Notes

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the database and import schema:

   ```bash
   mysql -u <user> -p <database> < database/schema.sql
   ```

3. Seed demo data:

   ```bash
   npm run seed
   ```

4. Start Node app:

   ```bash
   npm start
   ```

5. Start AI service:

   ```bash
   cd ai_service
   pip install -r requirements.txt
   python app.py
   ```

6. Open:

   ```text
   http://localhost:3000
   ```

## Testing Summary

- Automated basic tests:

  ```bash
  npm test
  ```

- Current automated checks:
  - Release document contains required sections.
  - AI chatbot, resume ranking, recommendation, and CV analysis routes exist.
  - Job search supports filter and pagination fields.
  - Candidate and employer profile routes exist.
  - Security/config hygiene is present: `.env` ignored, `.env.example` exists, LFS configured.
  - API/deployment/user-story/architecture documents exist.

- Integration testing evidence:
  - `docs/TEST_PLAN.md` defines API integration scenarios for auth, job search, candidate profile, employer dashboard, chatbot, recommendation, and resume ranking.
  - Full automated DB integration tests are planned for the next iteration.

