# User Stories and Acceptance Criteria

## Product Vision

JobLink helps candidates find suitable jobs and helps employers manage hiring in one web platform. The product value is faster matching between candidate profiles/CVs and employer requirements, supported by AI chatbot advice, resume ranking, and job recommendations.

## Target Users

- Candidate: wants to create a profile, upload CV, search jobs, apply, save jobs, and receive recommendations.
- Employer: wants to create a company profile, post jobs, review applicants, rank resumes, and manage hiring pipeline.
- Admin: wants to approve companies, manage users/jobs/categories, and monitor system status.

## Final Scope for v1.0.0

In scope:

- Authentication and role-based dashboards.
- Candidate profile and CV/avatar upload.
- Employer profile and job management.
- Job search, filters, and pagination.
- AI chatbot, recommendation, and resume ranking endpoints.
- Admin approval and management screens.
- Password recovery, legal-document acceptance, and configurable OAuth.
- Render/Supabase production deployment with persistent object storage.
- Automated regression tests, API docs, deployment notes, release notes, and self-assessment.

Out of scope for v1.0.0:

- Fully automated database integration tests.
- Full browser end-to-end automation.
- A dedicated online payment gateway beyond the configurable bank-transfer checkout.
- Paid always-on hosting and the optional 1 GB Sentence Transformer model.

## Stories

| ID | Role | Story | Acceptance Criteria | Evidence |
|---|---|---|---|---|
| US-01 | Candidate | As a candidate, I want to register/login so I can manage my job applications. | Candidate can register, login, receive JWT, and access candidate dashboard. | `routes/authRoutes.js`, `controllers/authController.js`, `public/login.html`, `public/register.html` |
| US-02 | Candidate | As a candidate, I want to maintain my profile and CV so employers can evaluate me. | Candidate can view/update profile and upload CV/avatar with file validation. | `routes/candidateRoutes.js`, `controllers/candidateController.js`, `middleware/upload.js` |
| US-03 | Candidate | As a candidate, I want to search and filter jobs so I can find relevant opportunities. | Jobs can be filtered by keyword/category/location/type/salary and paginated. | `controllers/jobController.js`, `models/jobModel.js`, `public/jobs.html`, `public/js/jobs.js` |
| US-04 | Candidate | As a candidate, I want recommendations so I can find jobs matching my skills. | Candidate dashboard can call `/api/ai/recommend` and show ranked suggestions. | `controllers/aiController.js`, `routes/aiRoutes.js`, `public/js/candidate-dashboard.js` |
| US-05 | Candidate | As a visitor, I want a chatbot so I can ask career and CV questions quickly. | Chatbot widget sends message to `/api/ai/chat`; fallback exists when Groq is unavailable. | `public/js/chatbot-widget.js`, `ai_service/app.py`, `ai_service/models/chatbot/faq_data.json` |
| US-06 | Employer | As an employer, I want to manage my company profile and jobs. | Employer can update profile/logo and create/update/delete own jobs after approval. | `routes/companyRoutes.js`, `routes/jobRoutes.js`, `controllers/companyController.js`, `controllers/jobController.js` |
| US-07 | Employer | As an employer, I want to rank resumes so I can shortlist candidates faster. | Employer/admin can analyze candidate CV/profile and candidate can view match score for a job. | `routes/aiRoutes.js`, `controllers/aiController.js`, `ai_service/app.py` |
| US-08 | Employer | As an employer, I want a hiring dashboard and applicant pipeline. | Employer dashboard shows jobs, applicants, and status updates. | `public/company-dashboard.html`, `public/js/company-dashboard.js`, `routes/applicationRoutes.js` |
| US-09 | Admin | As an admin, I want to approve companies and manage the platform. | Admin routes and dashboard provide stats and management screens. | `routes/adminRoutes.js`, `controllers/adminController.js`, `public/admin-dashboard.html` |

