# API Documentation - JobLink v0.2 Beta

Base URL:

```text
http://localhost:3000/api
```

Authenticated routes require:

```text
Authorization: Bearer <token>
```

## Auth

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/auth/register/candidate` | Public | Register a candidate account |
| POST | `/auth/register/company` | Public | Register an employer account |
| POST | `/auth/login` | Public | Login and receive JWT |
| GET | `/auth/me` | Authenticated | Return current user |
| GET | `/auth/providers` | Public | Return enabled OAuth providers |

## Jobs

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/jobs` | Public | Search jobs with filters and pagination |
| GET | `/jobs/featured` | Public | List featured jobs |
| GET | `/jobs/:id` | Public | View job detail |
| GET | `/jobs/company/my-jobs` | Employer | List employer's jobs |
| POST | `/jobs` | Employer | Create job |
| PUT | `/jobs/:id` | Employer | Update own job |
| DELETE | `/jobs/:id` | Employer | Delete own job |

Supported `/jobs` query parameters:

| Parameter | Example | Description |
|---|---|---|
| `keyword` | `developer` | Search title/description |
| `category_id` | `1` | Filter by category |
| `location` | `Ha Noi` | Filter by location |
| `job_type` | `full-time` | Filter by job type |
| `salary_min` | `10000000` | Filter by minimum salary |
| `page` | `1` | Pagination page |
| `limit` | `10` | Items per page |

## Candidates

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/candidates/me` | Candidate | View candidate profile |
| PUT | `/candidates/me` | Candidate | Update candidate profile |
| POST | `/candidates/me/cv` | Candidate | Upload CV file |
| POST | `/candidates/me/avatar` | Candidate | Upload avatar |
| GET | `/candidates/me/applications` | Candidate | List submitted applications |
| GET | `/candidates/me/saved-jobs` | Candidate | List saved jobs |
| POST | `/candidates/me/saved-jobs/:jobId` | Candidate | Save a job |
| DELETE | `/candidates/me/saved-jobs/:jobId` | Candidate | Remove saved job |

## Companies

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/companies/:id` | Public | View public company profile |
| GET | `/companies/me/profile` | Employer | View own company profile |
| PUT | `/companies/me/profile` | Employer | Update own company profile |
| POST | `/companies/me/logo` | Employer | Upload company logo |

## Applications

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/applications/:jobId` | Candidate | Apply to a job |
| GET | `/applications/job/:jobId` | Employer | List applicants for a job |
| PUT | `/applications/:id/status` | Employer | Update application status |

## AI

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/ai/health` | Public | Check AI service status |
| POST | `/ai/chat` | Public | Career chatbot |
| GET | `/ai/match/:jobId` | Candidate | Resume/job ranking for one job |
| GET | `/ai/recommend` | Candidate | Job recommendations |
| GET | `/ai/analyze-cv` | Candidate | Analyze own CV/profile |
| GET | `/ai/analyze-cv/:candidateId` | Employer/Admin | Analyze candidate CV/profile |

Example chatbot request:

```json
{
  "message": "Tôi nên viết CV như thế nào?",
  "history": []
}
```

## Admin

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/admin/stats` | Admin | Dashboard statistics |
| GET/PUT | `/admin/companies` | Admin | Manage company approval |
| GET/PUT | `/admin/users` | Admin | Manage users |
| GET/DELETE | `/admin/jobs` | Admin | Manage jobs |
| GET/POST/DELETE | `/admin/categories` | Admin | Manage categories |

## Categories and Payments

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/categories` | Public | List job categories |
| GET | `/payments/packages` | Public | List service packages |
| POST | `/payments/subscribe/:packageId` | Employer | Subscribe to package |

