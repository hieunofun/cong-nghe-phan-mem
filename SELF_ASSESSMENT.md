# Self Assessment - JobLink v0.2 Beta

This self-assessment is based on the Sommerville 80/20 rubric in the provided grading package.

## Target Final Score: 87/100

- Group score: 70/80
- Individual score template: 17/20
- Final target: 87/100

This score is a reasonable target for the current repo because the product has integrated functionality and stronger documentation evidence, but still has limitations in automated integration testing and production DevOps.

## Group Score: 70/80

| Category | Max | Score | Evidence |
|---|---:|---:|---|
| Product vision, users, features, scenarios, and stories | 10 | 9 | `README.md`, `docs/USER_STORIES.md`, `docs/RELEASE_v0.2.md` define users, MVP scope, stories, acceptance criteria, and limitations. |
| Functionality and delivered product value | 14 | 13 | Candidate/employer/admin dashboards, job search/filter/pagination, applications, profiles, AI chatbot, recommendation, and resume ranking are implemented for beta use. |
| Architecture and design rationale | 12 | 10 | `docs/ARCHITECTURE.md` explains frontend/backend/database/AI boundaries and trade-offs; code structure follows routes/controllers/models/middleware separation. |
| Code quality, maintainability, and reliable programming | 10 | 8 | Controllers and middleware handle missing input, auth errors, role checks, upload validation, AI offline behavior, and common error responses. |
| Testing and verification strategy | 9 | 7 | `npm test`, `tests/release-evidence.test.js`, and `docs/TEST_PLAN.md` cover release evidence and integration scenarios; DB-backed automated tests are still future work. |
| Security, privacy, and configuration hygiene | 8 | 7 | `.env` ignored, `.env.example` provided, JWT/role middleware, bcrypt password hashing, upload constraints, and Git LFS model tracking. |
| DevOps, code management, and reproducibility | 9 | 8 | Install/run/seed/test/deploy docs, Git tag release, Git LFS, and GitHub Actions workflow are provided. |
| Documentation, self-assessment, and theory-practice traceability | 8 | 8 | README, release notes, API docs, deployment notes, architecture notes, user stories, test plan, and this self-assessment connect theory to repo evidence. |

Total:

```text
9 + 13 + 10 + 8 + 7 + 7 + 8 + 8 = 70/80
```

## Individual Score Template: 17/20

Fill in the real student name and evidence before submitting.

| Category | Max | Suggested Score | Evidence to fill |
|---|---:|---:|---|
| Meaningful technical contribution | 7 | 6 | Implemented or integrated a major feature such as AI chatbot, recommendation, resume ranking, dashboard, profile, or backend API. |
| Theory-informed ownership and explanation | 5 | 4 | Explain user story, architecture role, reliability/security decision, and evidence file paths. |
| Collaboration, agile teamwork, and professionalism | 3 | 3 | Add commit/branch/task/issue evidence from the team workflow. |
| Testing, documentation, DevOps, and quality practices | 3 | 2 | Point to release docs, API docs, test plan, `npm test`, or deployment notes. |
| Reflection and improvement mindset | 2 | 2 | Mention limitations: integration tests, CI/CD depth, local uploads, separate AI deployment. |

## Theory to Practice Evidence

| Theory concept | Decision | Repo evidence | Result / limitation |
|---|---|---|---|
| Product vision and user stories | Define candidate, employer, admin workflows | `docs/USER_STORIES.md`, `README.md` | Features are tied to real users; more UI screenshots could improve evidence. |
| Architecture | Separate frontend, backend API, MySQL, and AI service | `docs/ARCHITECTURE.md`, `server.js`, `routes/`, `controllers/`, `models/`, `ai_service/` | Clear boundaries; deployment needs multiple services. |
| Reliable programming | Controlled errors for auth, role, uploads, AI offline state | `middleware/auth.js`, `middleware/upload.js`, `controllers/aiController.js` | Better user feedback; more automated edge-case tests needed. |
| Security/privacy | Keep secrets out of Git and restrict role-specific APIs | `.gitignore`, `.env.example`, `middleware/auth.js` | Good beta hygiene; production still needs HTTPS/storage hardening. |
| Testing | Add runnable basic tests and integration checklist | `tests/release-evidence.test.js`, `docs/TEST_PLAN.md` | Basic verification exists; DB integration tests remain the biggest gap. |
| DevOps | Provide reproducible setup and release tag | `docs/DEPLOYMENT.md`, `.github/workflows/ci.yml`, tag `v0.2` | Reproducible for grading; production pipeline can be expanded. |

## Known Limitations

- Automated DB-backed integration tests are not complete.
- Uploads are stored locally.
- AI service and Node app deploy separately.
- Production deployment requires real environment variables and persistent storage.
- Social login requires OAuth credentials.

## Improvement Plan

- Add integration tests with a test MySQL database.
- Add Docker Compose for Node, Flask, and MySQL.
- Add screenshots or demo video evidence.
- Add object storage for uploads.
- Expand CI to run AI service checks and database migrations.
