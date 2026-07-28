# Testing Plan

## Automated Tests

Run:

```bash
npm test
```

The final automated suite contains 22 release, validation, security and production-regression tests. It verifies important routes, docs, configuration hygiene, PostgreSQL TLS behavior, payment status mapping, Render configuration and AI cold-start retries.

## Unit Test Scope

- AI route registration:
  - Chatbot route exists.
  - Resume ranking route exists.
  - Recommendation route exists.
- Job search controller:
  - Filter and pagination fields exist.
- Profile routes:
  - Candidate profile routes exist.
  - Employer profile routes exist.
- Configuration:
  - `.env` is ignored.
  - `.env.example` exists.
  - The optional large Transformer model is ignored by Git.
  - Render Free explicitly enables lightweight AI mode.

## Integration Testing Checklist

These checks are intended for manual or future automated DB-backed integration tests.

| Scenario | Steps | Expected Result |
|---|---|---|
| Candidate auth flow | Register candidate, login, call `/api/auth/me` | JWT is accepted and candidate user is returned |
| Candidate profile | Update `/api/candidates/me`, upload CV/avatar | Profile and file paths are saved |
| Job search | Call `/api/jobs?keyword=dev&page=1&limit=10` | Response includes `jobs`, `total`, `page`, `limit`, `totalPages` |
| Employer job flow | Login employer, update company profile, create job | Approved employer can manage own jobs |
| Employer dashboard | View applicants for one job and update status | Applicant pipeline status changes |
| Admin approval | Login admin, approve company | Company can post jobs after approval |
| Chatbot | Call `/api/ai/chat` with message | Returns answer or AI offline message |
| Recommendation | Candidate with profile calls `/api/ai/recommend` | Returns ranked job suggestions |
| Resume ranking | Candidate calls `/api/ai/match/:jobId` | Returns match/ranking result or AI offline message |

## Verified Production Smoke Test

Verification performed on 2026-07-28:

| Endpoint | Result | Observation |
|---|---|---|
| `https://joblink-web.onrender.com/health` | HTTP 200 | `joblink-web` healthy; first response about 22 seconds |
| `https://joblink-web.onrender.com/api/categories` | HTTP 200 | Returned category data |
| `https://joblink-web.onrender.com/api/jobs/featured` | HTTP 200 | Returned featured-job data |
| `https://joblink-ai.onrender.com/health` | HTTP 200 | Lightweight mode; analyzer loaded; first response about 51 seconds |

Additional release checks:

- `npm run test:checkout-render`: passed.
- `npm audit`: 0 vulnerabilities.
- Main CI before the final release PR: https://github.com/hieunofun/cong-nghe-phan-mem/actions/runs/30258010023

## Manual Final Smoke Test

- Open home page.
- Register/login as candidate.
- Update candidate profile.
- Search jobs with filters.
- Save/apply to a job.
- Open candidate dashboard recommendations.
- Register/login as employer.
- Update company profile.
- Create and manage jobs.
- Review candidate applications.
- Login as admin and check dashboard stats/company approval.
- Open chatbot widget on a public page and send a message.

