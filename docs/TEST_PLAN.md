# Testing Plan

## Automated Tests

Run:

```bash
npm test
```

Current automated tests are basic release-evidence tests. They verify the presence of important routes, docs, configuration hygiene, and release sections.

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
  - Git LFS tracks the large AI model.

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

## Manual Beta Smoke Test

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

