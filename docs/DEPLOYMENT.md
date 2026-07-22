# Deployment Notes

Hướng dẫn production miễn phí hiện tại nằm tại [`RENDER_FREE_DEPLOY.md`](../RENDER_FREE_DEPLOY.md). Cấu hình chuẩn gồm hai Render Web Services và một dự án Supabase.

## Required Services

- Render Free cho Node.js web service
- Render Free cho Python AI service ở lightweight mode
- Supabase Free cho PostgreSQL và Storage
- Groq API key nếu muốn chatbot dùng mô hình Groq

## Environment Variables

Use `.env.example` as the template.

Important variables:

- `PORT`
- `DATABASE_URL`
- `DB_CLIENT=postgres`
- `JWT_SECRET`
- `SESSION_SECRET`
- `AI_SERVICE_HOST`
- `AI_SERVICE_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `GROQ_API_KEY`
- OAuth provider IDs/secrets when social login is enabled

Chạy migrations bằng tài khoản database backend:

```bash
npm run supabase:migrate
npm run supabase:storage
```

In development, the forgot-password API returns a reset link so the flow can be tested without an email server. Production deployments must configure an email delivery service and must not expose reset links in API responses.

## Local Run

```bash
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
- Use Supabase PostgreSQL through its session pooler.
- Deploy the Flask AI service separately and use the generated shared token.
- Use HTTPS.
- Store production uploads in Supabase Storage.
- Keep `AI_LIGHTWEIGHT_MODE=true`; the optional large Transformer model is not shipped to Render Free.
- Run `npm test` during CI before deployment.

## Rollback

Rollback to the previous Git tag or commit:

```bash
git checkout <previous-tag-or-commit>
```

Then redeploy the selected revision and database backup if schema changed.
