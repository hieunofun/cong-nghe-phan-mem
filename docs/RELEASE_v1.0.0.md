# JobLink v1.0.0 Final

## Release Title

JobLink v1.0.0 Final — AI-assisted recruitment platform for candidates, employers and administrators

## Release Notes

`v1.0.0` is the final course-submission release of JobLink. It contains the complete candidate, employer and administrator workflows from v0.2 Beta, plus the production deployment and reliability work merged through PR #16–#20.

Reviewer entry points:

- Production web: https://joblink-web.onrender.com
- Final readiness Issue: https://github.com/hieunofun/cong-nghe-phan-mem/issues/21
- Changelog: `CHANGELOG.md`
- Contributors: `CONTRIBUTORS.md`
- Release traceability: `docs/RELEASE_TRACEABILITY.md`
- Architecture: `docs/ARCHITECTURE.md`
- API documentation: `docs/API.md`
- Deployment notes: `docs/DEPLOYMENT.md`
- Testing plan: `docs/TEST_PLAN.md`
- CI workflow: `.github/workflows/ci.yml`

## Features

- AI Chatbot:
  - Public chatbot widget and `POST /api/ai/chat`.
  - Flask `POST /chat` using Groq RAG with a controlled FAQ fallback.
- Resume Ranking and Recommendation:
  - Candidate/job matching through `GET /api/ai/match/:jobId`.
  - CV analysis through `GET /api/ai/analyze-cv`.
  - Candidate recommendations through `GET /api/ai/recommend`.
- Dashboard:
  - Candidate Dashboard for profile, CV/avatar, applications, saved jobs and recommendations.
  - Employer Dashboard for company profile, job CRUD, applicants and CV search.
  - Admin Dashboard for statistics, approvals, users, jobs and categories.
- Candidate Profile and Employer Dashboard APIs with authentication and role checks.
- Search Filter and Pagination for jobs and employer CV search.
- Notification and validation messages across authentication, dashboard, payment and AI flows.
- API Documentation in `docs/API.md`.
- Production deployment on Render Free with Supabase PostgreSQL and Storage.

## Enhancements

- Added a reproducible Render Blueprint for the Node web service and Python AI service.
- Added Supabase PostgreSQL and persistent object storage support.
- Added Google/GitHub OAuth configuration placeholders that remain secret during Blueprint sync.
- Added password recovery and legal-document acceptance flows.
- Added retry and error classification for transient Render cold starts.
- Added final contributor, changelog, testing and release-traceability evidence.

## Bug Fixes

- PR #17 fixed Supabase TLS failures caused by `sslmode` URL parameters overriding the explicit PostgreSQL SSL object.
- PR #18 preserved OAuth credentials during Render Blueprint updates.
- PR #19 fixed PostgreSQL subscription-history errors and AI service URL normalization.
- PR #20 converted temporary AI 502/503 responses into retryable availability errors.
- Updated the development dependency lock to remove the reported `brace-expansion` vulnerability.

## Security and Reliability

- Production secrets remain outside Git and are injected by Render/Supabase.
- Passwords use bcrypt; protected routes use JWT/session and role checks.
- Production uploads use Supabase Storage instead of Render's ephemeral filesystem.
- AI bridge requests use a shared service token and tolerate expected free-tier cold starts.
- `npm audit` reports zero known vulnerabilities for the final dependency lock.

## Known Issues

- Render Free sleeps after inactivity. During the 2026-07-28 verification, the first web response took about 22 seconds and the AI health response about 51 seconds.
- The free deployment uses TF-IDF/skill matching instead of the optional 1 GB Sentence Transformer model.
- Full browser end-to-end testing and database-isolated integration testing are not yet automated.
- Groq, Render and Supabase free quotas may affect availability.
- SMTP, OAuth and bank-transfer checkout require valid external credentials; functionality depends on provider configuration.

## Migration Notes

- Install Node.js 20 and run `npm ci`.
- Copy `.env.example` to `.env` for local development; never commit `.env`.
- Use `npm run supabase:migrate` and `npm run supabase:storage` for the production Supabase project.
- Do not run the public demo seed on production.
- The optional large Transformer model is not required for the free production deployment.

## Deployment Notes

Production endpoints:

- Web application: https://joblink-web.onrender.com
- Web health: https://joblink-web.onrender.com/health
- AI health: https://joblink-ai.onrender.com/health

The production stack is:

1. `joblink-web`: Node.js/Express on Render Free.
2. `joblink-ai`: Flask/Gunicorn on Render Free in lightweight mode.
3. Supabase Free: PostgreSQL and Storage.
4. Groq API: chatbot generation when configured.

Detailed setup and rollback instructions are in `RENDER_FREE_DEPLOY.md` and `docs/DEPLOYMENT.md`.

## Testing Summary

Verification performed on 2026-07-28 from a clean worktree based on `origin/main`:

- `npm ci`: completed.
- `npm test`: 22 tests passed, 0 failed.
- `npm run test:checkout-render`: passed.
- `npm audit`: 0 vulnerabilities.
- Existing `main` CI: https://github.com/hieunofun/cong-nghe-phan-mem/actions/runs/30258010023
- Production smoke tests:
  - Web `/health`: HTTP 200.
  - Web `/api/categories`: HTTP 200 with category data.
  - Web `/api/jobs/featured`: HTTP 200 with job data.
  - AI `/health`: HTTP 200 with `deployment_mode: lightweight` and analyzer loaded.

The final release CI is also recorded in Issue #21 and on the release page after the release PR is merged.

## Contributor Acknowledgements

- Hiếu — [@hieunofun](https://github.com/hieunofun)
- Nguyên — [@Nguyen16112006](https://github.com/Nguyen16112006)
- Phương Anh — [@Phuonganh149](https://github.com/Phuonganh149)

Detailed evidence is recorded in `CONTRIBUTORS.md`.

## Changelog / Traceability

- Changelog: `CHANGELOG.md`
- Requirement-to-evidence matrix: `docs/RELEASE_TRACEABILITY.md`
- Final readiness Issue: https://github.com/hieunofun/cong-nghe-phan-mem/issues/21
- Production PRs: #16, #17, #18, #19, #20
- Release tag: `v1.0.0`
- Tag target: the tested `main` commit produced by the final release PR
