# Deployment Notes - JobLink v0.2 Beta

## Components

- Node.js/Express web app: `server.js`
- MySQL database: `database/schema.sql`
- Flask AI service: `ai_service/app.py`
- Static frontend: `public/`
- Local upload storage: `uploads/`

## Local Deployment

```bash
npm install
cp .env.example .env
mysql -u <user> -p <database> < database/schema.sql
npm run seed
npm start
```

Start AI service in a second terminal:

```bash
cd ai_service
pip install -r requirements.txt
python app.py
```

## Production Deployment Checklist

- Configure all values from `.env.example` as platform environment variables.
- Use a strong `JWT_SECRET`.
- Use a managed MySQL service or a secured MySQL instance.
- Configure `AI_SERVICE_URL` to point to the deployed Flask service.
- Configure `GROQ_API_KEY` if Groq RAG chatbot responses are required.
- Run `git lfs pull` during build/deploy if the AI model is required.
- Mount persistent storage or replace local upload storage with object storage before production use.
- Serve over HTTPS.

## Beta Limitations

- No GitHub Actions pipeline is included yet.
- Uploads are local-disk based.
- AI service is deployed separately from the Node app.
- Integration tests require a test database and are listed as future improvement.

