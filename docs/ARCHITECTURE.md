# Architecture and Design Rationale

## Overview

JobLink uses a layered web architecture split across Vercel, Render, and Supabase:

```text
Browser UI (Render Static Site)
  -> Express routes (Vercel Function)
  -> Controllers
  -> Models
  -> PostgreSQL (Supabase production) / MySQL (local)

Express backend (Vercel, Mumbai)
  -> Flask AI service (Render)
  -> Lightweight TF-IDF + skill matching / Groq API
```

## Components

| Component | Location | Responsibility |
|---|---|---|
| Static frontend | `public/` | HTML/CSS/JS screens for candidates, employers, admin, and public pages |
| Express entrypoint | `server.js` | CORS, middleware, API route mounting, local listener, and Vercel export |
| Routes | `routes/` | HTTP endpoint definitions and role guards |
| Controllers | `controllers/` | Business workflow and response handling |
| Models | `models/` | Database queries through the MySQL/PostgreSQL adapter |
| Middleware | `middleware/` | JWT authorization and file upload validation |
| Database | `database/` | Schema and seed data |
| AI service | `ai_service/` | Chatbot, resume ranking, recommendation, CV analysis |
| Uploads | `services/storageService.js` | Supabase Storage in production, local storage in development |

## Design Decisions

### Separate AI Service

Decision: keep AI features in `ai_service/` as a Flask service and call it from the Node backend.

Reason: AI dependencies and model loading are Python-friendly, while the web app is already Node/Express. This keeps service boundaries clear and avoids mixing Python ML dependencies into the Node app.

Limitation: deployment needs two processes and `AI_SERVICE_URL` must be configured.

### Split Frontend and Backend Hosting

Decision: publish `public/` as a Render Static Site and run Express as one Vercel Function in Mumbai, close to the Supabase `ap-south-1` database.

Reason: the frontend benefits from Render's global static CDN, while the API can scale independently on Vercel. `public/js/env.js` is generated at build time with only the public API origin. Express enforces an explicit frontend-origin allowlist and redirects OAuth/reset-password flows back to Render.

Constraint: Vercel Functions limit request and response payloads to 4.5 MB, so CV uploads are limited to 4 MB and persisted directly in Supabase Storage.

Evidence: `vercel.json`, `render.yaml`, `server.js`, `scripts/write-frontend-env.js`, and `VERCEL_RENDER_DEPLOY.md`.

### Role-Based Routes

Decision: protect candidate, company, and admin workflows with JWT middleware and role guards.

Reason: the product has three distinct user roles, and each role has different data access rules.

Evidence: `middleware/auth.js`, `routes/candidateRoutes.js`, `routes/companyRoutes.js`, `routes/adminRoutes.js`.

### Persistent Upload Storage

Decision: store CVs, logos, and avatars in Supabase Storage in production. Local development can use `uploads/`.

Reason: Render Free uses an ephemeral filesystem, so production uploads must be stored outside the web service.

Evidence: `services/storageService.js` and `scripts/setup-supabase-storage.js`.

### Application CV Snapshot and Lifecycle

Decision: each application stores the selected profile/application CV reference and filename, and every lifecycle change is appended to `application_status_history` beginning with the submission event.

Reason: replacing a profile CV must not remove the document already delivered to an employer, and both participants need an auditable view of the current stage and prior transitions.

Evidence: `models/applicationModel.js`, `controllers/applicationController.js`, `controllers/candidateController.js`, and `supabase/migrations/20260921180000_candidate_lifecycle_cv_tracking.sql`.

### Opt-in Automatic Application

Decision: automatic application is disabled by default. A candidate with a stored CV may explicitly enable it and choose a minimum AI match score. Newly published or reopened jobs evaluate only opted-in candidates, and qualifying applications are stored with source `auto_match`, the AI score, and a system-authored lifecycle event.

Reason: the feature can reduce missed opportunities without silently sharing a candidate's CV. Candidate consent, a configurable threshold, duplicate prevention, and an audit trail are mandatory parts of the workflow.

Evidence: `services/autoApplyService.js`, `utils/autoApply.js`, `controllers/jobController.js`, and `supabase/migrations/20260922100000_auto_apply_opt_in.sql`.

### Lightweight AI Matching on Free Hosting

Decision: do not ship the optional Sentence Transformer model in Git or load it on Render Free. Use TF-IDF plus skill coverage for matching.

Reason: the full Transformer runtime exceeds the practical memory budget of the free AI service. Chatbot RAG and CV analysis continue to work.

Evidence: `ai_service/requirements.render.txt`, `AI_LIGHTWEIGHT_MODE`, and `ai_service/app.py`.

## Reliability Notes

- Invalid/missing JWT returns `401`.
- Wrong role returns `403`.
- Missing profile/job records return `404`.
- Invalid profile/job inputs return `400`.
- AI service timeout/offline state returns `503` without crashing the main app.
- Upload middleware validates extension and file size.

## Security Notes

- `.env` is ignored.
- `.env.example` provides placeholders only.
- Passwords are hashed using bcrypt.
- Role guards protect dashboard-specific APIs.
- Upload file types and sizes are restricted.

