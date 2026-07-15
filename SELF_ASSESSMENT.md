# Self Assessment - JobLink v0.2 Beta

This self-assessment follows the Sommerville 80/20 rubric from the course package.

## Group Score: 69/80

| Category | Max | Score | Evidence |
|---|---:|---:|---|
| Product vision, users, features, scenarios, and stories | 10 | 8 | README explains JobLink as a recruitment platform for candidates, employers, and admins; release notes list beta scope and known issues. |
| Functionality and delivered product value | 14 | 12 | Candidate, employer, admin dashboards, job search, applications, profile management, AI chatbot, resume ranking, and recommendation are implemented. |
| Architecture and design rationale | 12 | 9 | Repo separates `controllers/`, `routes/`, `models/`, `middleware/`, `public/`, `database/`, and `ai_service/`; docs now describe component boundaries. |
| Code quality, maintainability, and reliable programming | 10 | 8 | Backend uses role middleware, models, controllers, validation checks, upload handling, and AI offline error responses. |
| Testing and verification strategy | 9 | 5 | Basic automated tests exist through `npm test`; integration/e2e and DB-backed tests remain limited. |
| Security, privacy, and configuration hygiene | 8 | 7 | `.env` is ignored, `.env.example` exists, JWT auth and role-based guards are implemented, uploads use middleware checks. |
| DevOps, code management, and reproducibility | 9 | 7 | Install/run/seed/test commands are documented; Git LFS handles large model file; deployment notes exist. CI/CD is not yet included. |
| Documentation, self-assessment, and theory-practice traceability | 8 | 7 | README, API docs, deployment notes, release notes, and this self-assessment provide evidence. |

## Individual Score Template: 16/20 Suggested Baseline

Fill this section with the real student name and contribution evidence before submitting.

| Category | Max | Suggested Score | Evidence to fill |
|---|---:|---:|---|
| Meaningful technical contribution | 7 | 6 | Example: implemented AI chatbot, dashboard, backend API, or database schema. |
| Theory-informed ownership and explanation | 5 | 4 | Explain which user story/scenario the feature supports and point to files. |
| Collaboration, agile teamwork, and professionalism | 3 | 2 | Add issue/commit/branch/PR/task evidence if available. |
| Testing, documentation, DevOps, and quality practices | 3 | 2 | Point to tests, docs, setup, release notes, or deployment work. |
| Reflection and improvement mindset | 2 | 2 | State limitations and next improvements honestly. |

## Theory to Practice Evidence

| Sommerville concept | Engineering decision | Repo evidence | Result / limitation |
|---|---|---|---|
| Product vision and user stories | Support three roles: candidate, employer, admin | `README.md`, `public/*dashboard.html`, `routes/*Routes.js` | Core recruitment workflows are visible; formal user story docs can be expanded. |
| Software architecture | Separate frontend, backend API, database, and AI service | `public/`, `controllers/`, `models/`, `routes/`, `database/`, `ai_service/` | Clear module boundaries; AI service still needs separate deployment. |
| Reliable programming | Validate missing inputs and return controlled errors | `controllers/authController.js`, `controllers/jobController.js`, `controllers/aiController.js` | Many user-facing errors are handled; deeper edge-case tests are future work. |
| Security and privacy | Keep secrets out of Git and protect role-specific routes | `.gitignore`, `.env.example`, `middleware/auth.js` | Good beta hygiene; production needs stronger monitoring and HTTPS deployment. |
| Testing | Add runnable basic tests for release evidence | `tests/release-evidence.test.js`, `package.json` | Tests are easy to run; integration tests with MySQL are still needed. |
| DevOps and reproducibility | Document install/run/test/deploy commands | `README.md`, `docs/DEPLOYMENT.md`, `docs/RELEASE_v0.2.md` | A reviewer can reproduce setup; CI/CD is not yet configured. |

## Known Limitations

- Automated test coverage is still basic.
- No CI/CD workflow is included.
- AI service and Node app must be run separately.
- Upload storage is local-disk based.
- Git LFS is required for the large model file.

## Improvement Plan

- Add MySQL-backed integration tests for auth, job search, applications, and AI bridge behavior.
- Add GitHub Actions to run `npm test`.
- Add Docker Compose for Node, Flask, and MySQL.
- Replace local uploads with object storage for production deployment.
- Add more detailed user stories and acceptance criteria for each role.

