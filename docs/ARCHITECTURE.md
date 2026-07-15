# Architecture and Design Rationale

## Overview

JobLink v0.2 uses a simple layered web architecture suitable for a course project and beta deployment:

```text
Browser UI
  -> Express routes
  -> Controllers
  -> Models
  -> MySQL

Express backend
  -> Flask AI service
  -> Local AI models / Groq API
```

## Components

| Component | Location | Responsibility |
|---|---|---|
| Static frontend | `public/` | HTML/CSS/JS screens for candidates, employers, admin, and public pages |
| Express entrypoint | `server.js` | Middleware, static assets, API route mounting |
| Routes | `routes/` | HTTP endpoint definitions and role guards |
| Controllers | `controllers/` | Business workflow and response handling |
| Models | `models/` | MySQL queries and persistence logic |
| Middleware | `middleware/` | JWT authorization and file upload validation |
| Database | `database/` | Schema and seed data |
| AI service | `ai_service/` | Chatbot, resume ranking, recommendation, CV analysis |
| Uploads | `uploads/` | Local storage for CV, logo, and avatar files |

## Design Decisions

### Separate AI Service

Decision: keep AI features in `ai_service/` as a Flask service and call it from the Node backend.

Reason: AI dependencies and model loading are Python-friendly, while the web app is already Node/Express. This keeps service boundaries clear and avoids mixing Python ML dependencies into the Node app.

Limitation: deployment needs two processes and `AI_SERVICE_URL` must be configured.

### Role-Based Routes

Decision: protect candidate, company, and admin workflows with JWT middleware and role guards.

Reason: the product has three distinct user roles, and each role has different data access rules.

Evidence: `middleware/auth.js`, `routes/candidateRoutes.js`, `routes/companyRoutes.js`, `routes/adminRoutes.js`.

### Local Upload Storage for Beta

Decision: store uploaded CVs/logos/avatars under `uploads/`.

Reason: simple and reproducible for local demo and course grading.

Limitation: production should move uploads to object storage or persistent volume.

### Git LFS for AI Model

Decision: track the large `model.safetensors` file with Git LFS.

Reason: GitHub blocks normal files over 100MB and LFS is the correct mechanism for large model artifacts.

Evidence: `.gitattributes`.

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

