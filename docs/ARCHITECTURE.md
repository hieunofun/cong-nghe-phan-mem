# Architecture and Design Rationale

## Overview

JobLink v0.2 uses a simple layered web architecture suitable for a course project and beta deployment:

```text
Browser UI
  -> Express routes
  -> Controllers
  -> Models
  -> PostgreSQL (Supabase production) / MySQL (local)

Express backend
  -> Flask AI service
  -> Lightweight TF-IDF + skill matching / Groq API
```

## Components

| Component | Location | Responsibility |
|---|---|---|
| Static frontend | `public/` | HTML/CSS/JS screens for candidates, employers, admin, and public pages |
| Express entrypoint | `server.js` | Middleware, static assets, API route mounting |
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

### Role-Based Routes

Decision: protect candidate, company, and admin workflows with JWT middleware and role guards.

Reason: the product has three distinct user roles, and each role has different data access rules.

Evidence: `middleware/auth.js`, `routes/candidateRoutes.js`, `routes/companyRoutes.js`, `routes/adminRoutes.js`.

### Persistent Upload Storage

Decision: store CVs, logos, and avatars in Supabase Storage in production. Local development can use `uploads/`.

Reason: Render Free uses an ephemeral filesystem, so production uploads must be stored outside the web service.

Evidence: `services/storageService.js` and `scripts/setup-supabase-storage.js`.

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

