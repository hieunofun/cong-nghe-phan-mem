const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(projectRoot, 'code-gui-ban', 'chatbot-ai');

const filesToCopy = [
  ['public/js/chatbot-widget.js', 'frontend/chatbot-widget.js'],
  ['routes/aiRoutes.js', 'node/routes/aiRoutes.js'],
  ['controllers/aiController.js', 'node/controllers/aiController.js'],
  ['server.js', 'node/server-reference.js'],
  ['ai_service/app.py', 'python/app.py'],
  ['ai_service/requirements.txt', 'python/requirements-full.txt'],
  ['ai_service/README.md', 'python/README-goc.md'],
  ['ai_service/models/chatbot/faq_data.json', 'python/models/chatbot/faq_data.json']
];

function writeFile(relativePath, content) {
  const target = path.join(outputRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

filesToCopy.forEach(([source, destination]) => {
  const sourcePath = path.join(projectRoot, source);
  const targetPath = path.join(outputRoot, destination);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
});

writeFile('.env.example', [
  'AI_SERVICE_URL=http://127.0.0.1:5000',
  'GROQ_API_KEY=your_groq_api_key',
  'GROQ_MODEL=llama-3.3-70b-versatile',
  'DB_HOST=localhost',
  'DB_USER=root',
  'DB_PASSWORD=your_database_password',
  'DB_NAME=joblink_db',
  ''
].join('\n'));

writeFile('python/requirements-chatbot.txt', [
  'flask==3.0.3',
  'flask-cors==4.0.1',
  'scikit-learn==1.5.1',
  'numpy==1.26.4',
  'joblib==1.4.2',
  'groq>=0.9.0',
  'pymysql>=1.1.0',
  'python-dotenv>=1.0.0',
  ''
].join('\n'));

writeFile('README.md', `# Ma nguon Chatbot AI JobLink

Goi nay chua phan chatbot duoc trich tu du an JobLink. File .env that, log va cac model AI dung luong lon khong duoc dua vao goi.

## Thanh phan

- frontend/chatbot-widget.js: giao dien chatbot noi tren website.
- node/routes/aiRoutes.js: cac route /api/ai.
- node/controllers/aiController.js: cau noi Node.js sang Flask.
- node/server-reference.js: file tham khao cach gan route vao Express.
- python/app.py: Flask AI Service, Groq va RAG.
- python/models/chatbot/faq_data.json: kho du lieu FAQ noi bo.
- python/requirements-chatbot.txt: thu vien toi thieu de chay chatbot.
- python/requirements-full.txt: toan bo thu vien AI cua du an goc.

## Tich hop widget

Dat chatbot-widget.js vao public/js, sau do them truoc the dong body:

\`\`\`html
<script src="/js/chatbot-widget.js"></script>
\`\`\`

Widget gui cau hoi toi POST /api/ai/chat. CSS cua trang can co cac bien mau JobLink nhu --primary, --surface va --border.

## Chay AI Service

1. Sao chep .env.example thanh .env va dien cau hinh cua moi truong nhan.
2. Mo terminal trong thu muc python.
3. Chay:

\`\`\`bash
pip install -r requirements-chatbot.txt
python app.py
\`\`\`

Flask chay tai http://localhost:5000. Neu khong co GROQ_API_KEY, chatbot van co the tra loi fallback tu FAQ RAG.

## Gan route vao Express

\`\`\`js
const aiRoutes = require('./routes/aiRoutes');
app.use('/api/ai', aiRoutes);
\`\`\`

Hai file Node trong goi la ma nguon nguyen ban cua du an JobLink va phu hop nhat khi dua vao cung cau truc project JobLink.
`);

console.log(`Da dong goi ma nguon chatbot tai: ${outputRoot}`);
