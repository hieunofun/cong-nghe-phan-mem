# JobLink AI Service

Flask microservice cung cấp 4 tính năng AI cho hệ thống JobLink.
Chatbot hiện dùng Groq API + RAG: truy xuất dữ liệu FAQ nội bộ và dữ liệu JobLink realtime trong MySQL local hoặc PostgreSQL/Supabase production, sau đó đưa context vào LLM để trả lời.

## Kiến trúc tổng thể

```
Google Colab         ai_service/        Node.js (port 3000)    Frontend
─────────────        ───────────        ───────────────────    ────────
Train models    →    app.py             /api/ai/match          Job detail page
Save to Drive   →    port 5000    ←     /api/ai/recommend      Jobs page
                     /match             /api/ai/analyze-cv     Candidate dashboard
                     /recommend         /api/ai/chat           Chatbot widget
                     /analyze-cv
                     /chat
```

## Hướng dẫn cài đặt

### Bước 1 — Train models trên Google Colab

1. Mở file `notebook/AI_JobLink_Training.ipynb` trên [Google Colab](https://colab.research.google.com)
2. Vào **Runtime → Change runtime type → T4 GPU**
3. Chạy tất cả cells (khoảng 15–25 phút)
4. Models sẽ được lưu tự động vào Google Drive tại thư mục `joblink_ai_models/`
5. Tải thư mục `joblink_ai_models/` về máy

### Bước 2 — Đặt models vào đúng chỗ

Sau khi tải về, copy toàn bộ nội dung vào thư mục `ai_service/models/`:

```
ai_service/
└── models/
    ├── cv_job_matching/          ← model sentence-transformer tùy chọn, chỉ lưu local
    │   ├── config.json
    │   ├── pytorch_model.bin
    │   └── ...
    ├── cv_analyzer/
    │   ├── exp_vectorizer.pkl
    │   ├── exp_classifier.pkl
    │   └── analyzer_data.json
    └── chatbot/
        └── faq_data.json        ← dữ liệu tri thức FAQ, service tự build RAG index khi chạy
```

> **Lưu ý:** Model Sentence Transformer không được đưa lên Git và Render Free không tải model này. Flask service vẫn chấm điểm thật bằng TF-IDF + độ phủ kỹ năng. CV analyzer dùng rule-based khi classifier không tải được.
> Chatbot không cần `tfidf_vectorizer.pkl` nữa. File này đã được thay bằng RAG index tạo động từ `faq_data.json`.

### Bước 3 — Cài đặt dependencies Python

Cần Python 3.10+ và pip. Mở terminal trong thư mục `ai_service/`:

```bash
python -m pip install -r requirements.txt
```

File `requirements.txt` dành cho máy local muốn dùng đầy đủ PyTorch và sentence-transformers nên có thể tải khoảng 2 GB. Render Free dùng `requirements.render.txt` nhẹ hơn.

Trên Windows, nếu PyTorch báo lỗi DLL, cài lại bản CPU chính thức:

```bash
python -m pip install --force-reinstall torch==2.11.0 --index-url https://download.pytorch.org/whl/cpu
```

### Bước 3.1 — Cấu hình Groq cho chatbot RAG

Thêm vào file `.env` ở thư mục gốc dự án:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

Nếu chưa có `GROQ_API_KEY`, chatbot vẫn chạy fallback bằng FAQ RAG nhưng chỉ trả lời được các câu gần với dữ liệu trong `faq_data.json`.

### Bước 4 — Chạy Flask service

```bash
npm run ai
```

Service sẽ chạy tại `http://localhost:5000`. Để cửa sổ terminal này mở trong khi dùng JobLink.

### Bước 5 — Chạy Node.js như bình thường

```bash
npm start
```

Node.js sẽ tự động gọi sang Flask khi cần AI. Nếu Flask chưa chạy, các tính năng AI sẽ hiển thị thông báo lỗi nhẹ, không ảnh hưởng đến các tính năng khác.

CV tải lên được đọc trực tiếp khi phân tích/chấm điểm. Hệ thống hỗ trợ PDF và DOCX; file `.doc` cũ cần chuyển sang một trong hai định dạng này.

## Endpoints

| Method | URL | Mô tả |
|--------|-----|--------|
| GET | `/health` | Kiểm tra trạng thái service và models |
| POST | `/match` | Chấm điểm phù hợp CV–Job (0–100%) |
| POST | `/recommend` | Gợi ý việc làm cho ứng viên |
| POST | `/analyze-cv` | Phân tích CV: kỹ năng, kinh nghiệm, gợi ý vị trí |
| POST | `/chat` | Chatbot tư vấn nghề nghiệp |

## Chatbot RAG hoạt động như thế nào

1. Nhận câu hỏi và lịch sử hội thoại gần nhất từ widget.
2. Truy xuất dữ liệu phù hợp từ `models/chatbot/faq_data.json`.
3. Nếu câu hỏi liên quan việc làm/công ty/lương/ngành nghề, service query MySQL/PostgreSQL để lấy context JobLink realtime.
4. Gửi context + câu hỏi + lịch sử hội thoại sang Groq Chat Completions.
5. Nếu Groq lỗi hoặc chưa cấu hình key, trả lời fallback bằng FAQ phù hợp nhất.

## Test thử nhanh (sau khi Flask đang chạy)

```bash
# Kiểm tra health
curl http://localhost:5000/health

# Test matching
curl -X POST http://localhost:5000/match \
  -H "Content-Type: application/json" \
  -d "{\"cv_text\":\"3 nam Python Django REST API\",\"job_text\":\"Can Backend Developer Python Django\"}"

# Test chatbot
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Học lập trình bắt đầu từ đâu?\"}"
```
