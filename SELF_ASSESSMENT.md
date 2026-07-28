# Self Assessment - JobLink v1.0.0 Final

This self-assessment is based on the Sommerville 80/20 rubric in the provided grading package.

## Target Final Score: 91/100

- Group score: 73/80
- Individual score template: 18/20
- Final target: 91/100

This score is supported by the stable `v1.0.0` GitHub Release, Issue #21, PR #16–#20, the final release CI, production smoke tests, and `docs/RELEASE_v1.0.0.md`.

## Group Score: 73/80

| Category | Max | Score | Evidence |
|---|---:|---:|---|
| Product vision, users, features, scenarios, and stories | 10 | 9 | `README.md`, `docs/USER_STORIES.md`, `docs/RELEASE_v1.0.0.md` define users, scope, stories, acceptance criteria, and limitations. |
| Functionality and delivered product value | 14 | 13 | Candidate/employer/admin dashboards, job search/filter/pagination, applications, profiles, AI chatbot, recommendation, and resume ranking are implemented and deployed. |
| Architecture and design rationale | 12 | 11 | `docs/ARCHITECTURE.md` explains frontend/backend/database/AI boundaries and trade-offs; code structure follows routes/controllers/models/middleware separation. |
| Code quality, maintainability, and reliable programming | 10 | 9 | Controllers and middleware handle missing input, auth errors, role checks, upload validation, AI offline behavior, common error responses, and feature boundaries remain maintainable across routes/controllers/models. |
| Testing and verification strategy | 9 | 7 | `npm test` passes 22/22, Render checkout passes, production endpoints return HTTP 200, and `docs/TEST_PLAN.md` records remaining DB/browser automation gaps. |
| Security, privacy, and configuration hygiene | 8 | 7 | `.env` ignored, JWT/role middleware, bcrypt, HTTPS, Supabase Storage, secret Blueprint inputs, and `npm audit` with zero vulnerabilities. |
| DevOps, code management, and reproducibility | 9 | 9 | Render Blueprint, Supabase setup, stable tag/release, changelog, traceability, Issues/PRs and GitHub Actions CI are provided. |
| Documentation, self-assessment, and theory-practice traceability | 8 | 8 | README, release notes, API docs, deployment notes, architecture notes, user stories, test plan, and this self-assessment connect theory to repo evidence. |

Total:

```text
9 + 13 + 11 + 9 + 7 + 7 + 9 + 8 = 73/80
```

## Individual Score Template: 18/20

Fill in the real student name and evidence before submitting.

| Category | Max | Suggested Score | Evidence to fill |
|---|---:|---:|---|
| Meaningful technical contribution | 7 | 7 | Implemented or integrated a major feature such as AI chatbot, recommendation, resume ranking, dashboard, profile, or backend API. |
| Theory-informed ownership and explanation | 5 | 4 | Explain user story, architecture role, reliability/security decision, and evidence file paths. |
| Collaboration, agile teamwork, and professionalism | 3 | 3 | Add commit/branch/task/issue evidence from the team workflow. |
| Testing, documentation, DevOps, and quality practices | 3 | 2 | Point to release docs, API docs, test plan, `npm test`, or deployment notes. |
| Reflection and improvement mindset | 2 | 2 | Mention limitations: integration tests, CI/CD depth, local uploads, separate AI deployment. |

## Theory to Practice Evidence

| Theory concept | Decision | Repo evidence | Result / limitation |
|---|---|---|---|
| Product vision and user stories | Define candidate, employer, admin workflows | `docs/USER_STORIES.md`, `README.md` | Features are tied to real users; more UI screenshots could improve evidence. |
| Architecture | Separate frontend, backend API, PostgreSQL/MySQL, storage, and AI service | `docs/ARCHITECTURE.md`, `server.js`, `routes/`, `controllers/`, `models/`, `ai_service/` | Clear boundaries; Render and Supabase host the production components. |
| Reliable programming | Controlled errors for auth, role, uploads, AI offline state | `middleware/auth.js`, `middleware/upload.js`, `controllers/aiController.js` | Better user feedback; more automated edge-case tests needed. |
| Security/privacy | Keep secrets out of Git and restrict role-specific APIs | `.gitignore`, `.env.example`, `middleware/auth.js`, `render.yaml` | Production uses HTTPS and Supabase Storage; external credentials still require operational care. |
| Testing | Add runnable basic tests and integration checklist | `tests/release-evidence.test.js`, `docs/TEST_PLAN.md` | Basic verification exists; DB integration tests remain the biggest gap. |
| DevOps | Provide reproducible setup and release tag | `docs/DEPLOYMENT.md`, `.github/workflows/ci.yml`, tag `v1.0.0` | Reproducible and deployed; free-tier cold starts remain. |

## Known Limitations

- Automated DB-backed integration tests are not complete.
- Full browser end-to-end and database-isolated integration suites are not automated.
- Render Free cold starts can delay the first web or AI request by 20–60 seconds.
- Production uses lightweight AI matching instead of the optional 1 GB Transformer model.
- SMTP, OAuth, bank-transfer checkout, Groq and Supabase depend on external credentials and quotas.

## Improvement Plan

- Add integration tests with a test MySQL database.
- Add Docker Compose for Node, Flask, and MySQL.
- Add screenshots or demo video evidence.
- Add automated browser end-to-end testing.
- Add an isolated PostgreSQL integration-test environment.
- Expand CI to exercise the Python AI service and migration dry-runs.
