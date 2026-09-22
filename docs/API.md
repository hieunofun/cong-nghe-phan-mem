# API Documentation

Base URL:

```text
http://localhost:3000/api
```

Authenticated endpoints require:

```text
Authorization: Bearer <token>
```

## Auth

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/auth/register/candidate` | Public | Register candidate |
| POST | `/auth/register/company` | Public | Register employer |
| POST | `/auth/login` | Public | Login and receive JWT |
| POST | `/auth/forgot-password` | Public | Create a time-limited password reset request |
| POST | `/auth/reset-password` | Public | Set a new password using a one-time token |
| GET | `/auth/me` | Authenticated | Get current user |
| GET | `/auth/providers` | Public | List OAuth provider availability |

## Jobs

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| GET | `/jobs` | Public | Search jobs with filters and pagination |
| GET | `/jobs/featured` | Public | Featured jobs for home page |
| GET | `/jobs/:id` | Public | Job detail |
| GET | `/jobs/company/my-jobs` | Employer | Employer job list |
| POST | `/jobs` | Employer | Create job |
| PUT | `/jobs/:id` | Employer | Update own job |
| DELETE | `/jobs/:id` | Employer | Delete own job |

`GET /jobs` query parameters:

| Name | Description |
|---|---|
| `keyword` | Text search |
| `category_id` | Category filter |
| `location` | Location filter |
| `job_type` | Job type filter |
| `salary_min` | Minimum salary filter |
| `page` | Page number |
| `limit` | Items per page |

## Candidates

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| GET | `/candidates/me` | Candidate | View profile |
| PUT | `/candidates/me` | Candidate | Update profile and opt-in `auto_apply_enabled` / `auto_apply_min_score` preferences |
| POST | `/candidates/me/cv` | Candidate | Upload CV |
| POST | `/candidates/me/avatar` | Candidate | Upload avatar |
| GET | `/candidates/me/applications` | Candidate | View own applications |
| GET | `/candidates/me/saved-jobs` | Candidate | View saved jobs |
| POST | `/candidates/me/saved-jobs/:jobId` | Candidate | Save job |
| DELETE | `/candidates/me/saved-jobs/:jobId` | Candidate | Unsave job |

## Companies

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| GET | `/companies/:id` | Public | Public company profile |
| GET | `/companies/me/profile` | Employer | Own company profile |
| PUT | `/companies/me/profile` | Employer | Update company profile |
| POST | `/companies/me/logo` | Employer | Upload logo |

## Applications

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/applications/:jobId` | Candidate | Apply to job |
| GET | `/applications/job/:jobId` | Employer | View applicants |
| PUT | `/applications/:id/status` | Employer | Update applicant status |
| GET | `/applications/:id/history` | Candidate/Employer | View the complete status timeline when authorized for the application |

`POST /jobs` and reopening a job can return an `auto_apply` summary. Only candidates who explicitly enabled automatic application, uploaded a CV, and met their own score threshold are evaluated into new applications.

## AI

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| GET | `/ai/health` | Public | AI service health |
| POST | `/ai/chat` | Public | AI chatbot |
| GET | `/ai/match/:jobId` | Candidate | Resume ranking against one job |
| GET | `/ai/recommend` | Candidate | Job recommendations |
| GET | `/ai/analyze-cv` | Candidate | Analyze own CV/profile |
| GET | `/ai/analyze-cv/:candidateId` | Employer/Admin | Analyze candidate CV/profile |

Example chatbot body:

```json
{
  "message": "Tôi nên viết CV như thế nào?",
  "history": []
}
```

When the question requests job suggestions, the response includes safe internal links:

```json
{
  "reply": "Mình tìm thấy các công việc đang tuyển...",
  "jobs": [
    {
      "id": 1,
      "title": "Lập trình viên Backend Node.js",
      "company_name": "VietSoft Solutions",
      "url": "/job-detail.html?id=1"
    }
  ]
}
```

CV ranking accepts Unicode text extracted from Vietnamese or English PDF/DOCX files. The matching layer folds Vietnamese accents and maps common Vietnamese-English role, technical, and soft-skill synonyms before scoring.

## Admin

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| GET | `/admin/stats` | Admin | Dashboard statistics |
| GET/PUT | `/admin/companies` | Admin | Company approval |
| GET/PUT | `/admin/users` | Admin | User management |
| GET/DELETE | `/admin/jobs` | Admin | Job moderation |
| GET/POST/DELETE | `/admin/categories` | Admin | Category management |
