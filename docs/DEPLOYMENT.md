# Deployment Notes

## Required Services

- Node.js 18+
- MySQL 8+ or compatible MariaDB
- Python 3.10+ for AI service
- Git LFS for the large model file

## Environment Variables

Use `.env.example` as the template.

Important variables:

- `PORT`
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `SESSION_SECRET`
- `AI_SERVICE_URL`
- `GROQ_API_KEY`
- OAuth provider IDs/secrets when social login is enabled

For an existing v0.2 database, apply the authentication migration once:

```bash
mysql -u root -p < database/auth_enhancements.sql
```

In development, the forgot-password API returns a reset link so the flow can be tested without an email server. Production deployments must configure an email delivery service and must not expose reset links in API responses.

## Local Run

```bash
git lfs pull
npm install
cp .env.example .env
mysql -u <user> -p <database> < database/schema.sql
npm run seed
npm start
```

Start AI service:

```bash
cd ai_service
pip install -r requirements.txt
python app.py
```

Open:

```text
http://localhost:3000
```

## Production Notes

- Configure environment variables in the hosting platform instead of committing `.env`.
- Use a managed MySQL instance.
- Deploy the Flask AI service separately and set `AI_SERVICE_URL`.
- Use HTTPS.
- Replace local upload storage with persistent storage or object storage.
- Run `npm test` during CI before deployment.

## Rollback

Rollback to the previous Git tag or commit:

```bash
git checkout <previous-tag-or-commit>
```

Then redeploy the selected revision and database backup if schema changed.
