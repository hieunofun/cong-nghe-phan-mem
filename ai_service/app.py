# ai_service/app.py
import os
import json
import re
import hmac
import unicodedata
import joblib
import numpy as np
from groq import Groq
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# JobLink chi dung PyTorch; tranh Transformers tu nap TensorFlow/Keras 3 khong tuong thich.
os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("TRANSFORMERS_NO_TF", "1")
os.environ.setdefault("HF_HOME", os.path.join(os.path.dirname(__file__), ".cache", "huggingface"))

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

LIGHTWEIGHT_MODE = os.getenv("AI_LIGHTWEIGHT_MODE", "").lower() in {"1", "true", "yes"}

try:
    if LIGHTWEIGHT_MODE:
        raise ImportError("AI_LIGHTWEIGHT_MODE dang bat")
    from sentence_transformers import SentenceTransformer, util
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except Exception as exc:
    SentenceTransformer = None
    util = None
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    print(f"  ⚠️  CV matching khong san sang: {exc}")
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)
CORS(app)

AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "")
if os.getenv("RENDER", "").lower() == "true":
    missing_render_env = [
        name for name in ("DATABASE_URL", "AI_SERVICE_TOKEN") if not os.getenv(name)
    ]
    if missing_render_env:
        raise RuntimeError(
            "Thieu bien moi truong Render: " + ", ".join(missing_render_env)
        )


@app.before_request
def verify_service_token():
    """Chan truy cap truc tiep vao API AI khi da cau hinh shared secret."""
    if request.method == "OPTIONS" or request.path == "/health" or not AI_SERVICE_TOKEN:
        return None
    provided = request.headers.get("X-JobLink-AI-Token", "")
    if not hmac.compare_digest(provided, AI_SERVICE_TOKEN):
        return jsonify({"error": "Khong co quyen truy cap dich vu AI."}), 401
    return None


def get_db():
    db_client = os.getenv("DB_CLIENT", "postgres" if os.getenv("DATABASE_URL") else "mysql").lower()
    if db_client in {"postgres", "postgresql", "supabase"}:
        import psycopg
        from psycopg.rows import dict_row

        database_url = os.getenv("DATABASE_URL", "")
        if not database_url:
            raise RuntimeError("Thieu DATABASE_URL cho PostgreSQL/Supabase.")
        options = {
            "row_factory": dict_row,
            "connect_timeout": 5,
        }
        if "supabase.co" in database_url and "sslmode=" not in database_url:
            options["sslmode"] = "require"
        return psycopg.connect(database_url, **options)

    import pymysql
    import pymysql.cursors
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "joblink_db"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5,
    )

# ── GROQ API ─────────────────────────────────────────────────
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
groq_client = None
groq_verified = False
groq_key = os.getenv("GROQ_API_KEY", "")
if groq_key:
    groq_client = Groq(api_key=groq_key)
    print(f"  ✅ Groq API da ket noi ({GROQ_MODEL})")
else:
    print("  ⚠️  Chua co GROQ_API_KEY trong .env — dung fallback RAG FAQ")

# ── LOAD AI MODELS ────────────────────────────────────────────
BASE = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE, "models")
print("Dang tai models...")

MATCHING_PATH = os.path.join(MODELS_DIR, "cv_job_matching")
matching_model = None
matching_backend = "tfidf_fallback"
if SENTENCE_TRANSFORMERS_AVAILABLE and os.path.exists(MATCHING_PATH):
    try:
        matching_model = SentenceTransformer(MATCHING_PATH)
        matching_backend = "sentence_transformer"
        print("  ✅ CV-Job Matching model da tai")
    except Exception as exc:
        print(f"  ⚠️  Khong the tai CV-Job Matching model: {exc}")
elif SENTENCE_TRANSFORMERS_AVAILABLE:
    print("  ⚠️  Chua co model fine-tune; dung TF-IDF fallback")
else:
    print("  ⚠️  Sentence Transformers khong san sang; dung TF-IDF fallback")

analyzer_vectorizer = analyzer_classifier = None
analyzer_data = {}
vec_p = os.path.join(MODELS_DIR, "cv_analyzer", "exp_vectorizer.pkl")
clf_p = os.path.join(MODELS_DIR, "cv_analyzer", "exp_classifier.pkl")
dat_p = os.path.join(MODELS_DIR, "cv_analyzer", "analyzer_data.json")
if all(os.path.exists(p) for p in [vec_p, clf_p, dat_p]):
    try:
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            analyzer_vectorizer = joblib.load(vec_p)
            analyzer_classifier = joblib.load(clf_p)
        with open(dat_p, encoding='utf-8') as f:
            analyzer_data = json.load(f)
        print("  ✅ CV Analyzer da tai")
    except Exception as exc:
        print(f"  ⚠️  Khong the tai CV Analyzer; dung rule-based fallback: {exc}")
else:
    print("  ⚠️  Chua co CV Analyzer")

chatbot_faq = []
rag_vectorizer = rag_matrix = None
rag_documents = []
faq_p = os.path.join(MODELS_DIR, "chatbot", "faq_data.json")

def build_chatbot_rag_index():
    global rag_vectorizer, rag_matrix, rag_documents
    rag_documents = []
    for idx, item in enumerate(chatbot_faq):
        question = str(item.get("question", "")).strip()
        answer = str(item.get("answer", "")).strip()
        if not question or not answer:
            continue
        rag_documents.append({
            "id": f"faq-{idx + 1}",
            "source": "faq_data.json",
            "question": question,
            "answer": answer,
            "content": f"Câu hỏi mẫu: {question}\nCâu trả lời tham khảo: {answer}"
        })

    if rag_documents:
        rag_vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=8000)
        rag_matrix = rag_vectorizer.fit_transform([d["content"].lower() for d in rag_documents])
        print(f"  ✅ Chatbot RAG index da tai ({len(rag_documents)} FAQ chunks)")

if os.path.exists(faq_p):
    with open(faq_p, encoding='utf-8') as f:
        chatbot_faq = json.load(f)
    build_chatbot_rag_index()
else:
    print("  ⚠️  Chua co faq_data.json cho Chatbot RAG")

print("✅ AI Service san sang!\n")

# ── INTENT DETECTION ─────────────────────────────────────────
KEYWORDS = {
    "job": ["việc", "tuyển", "job", "vị trí", "tin tuyển", "đang tuyển",
            "có việc", "tìm việc", "ứng tuyển", "công việc"],
    "salary": ["lương", "thu nhập", "salary", "tiền", "mức lương"],
    "company": ["công ty", "doanh nghiệp", "company", "nhà tuyển dụng"],
    "category": ["ngành", "lĩnh vực", "category", "chuyên ngành"],
    "stats": ["bao nhiêu", "tổng", "có gì", "danh sách", "thống kê", "đang có"],
}

def detect_intent(question):
    q = question.lower()
    return {k for k, kws in KEYWORDS.items() if any(kw in q for kw in kws)}

def fetch_db_context(question):
    intents = detect_intent(question)
    if not intents:
        return "", {}

    context_parts = []
    raw_data = {}
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT
                (SELECT COUNT(*) FROM jobs WHERE status='active') AS active_jobs,
                (SELECT COUNT(*) FROM companies WHERE status='approved') AS approved_companies,
                (SELECT COUNT(*) FROM candidates) AS total_candidates,
                (SELECT COUNT(*) FROM applications) AS total_applications
        """)
        stats = cur.fetchone()
        raw_data['stats'] = stats
        context_parts.append(
            f"📊 THỐNG KÊ JOBLINK: {stats['active_jobs']} tin đang tuyển | "
            f"{stats['approved_companies']} công ty | "
            f"{stats['total_candidates']} ứng viên | "
            f"{stats['total_applications']} lượt ứng tuyển"
        )

        if intents & {'job', 'salary', 'stats'}:
            cur.execute("""
                SELECT j.title, j.location, j.job_type,
                       j.salary_min, j.salary_max, j.salary_negotiable,
                       j.experience_level, j.is_vip,
                       c.company_name, cat.name AS category_name
                FROM jobs j
                JOIN companies c ON c.id = j.company_id
                LEFT JOIN categories cat ON cat.id = j.category_id
                WHERE j.status = 'active' AND c.status = 'approved'
                ORDER BY j.is_vip DESC, j.created_at DESC
                LIMIT 15
            """)
            jobs = cur.fetchall()
            raw_data['jobs'] = jobs
            if jobs:
                context_parts.append("\n💼 TIN TUYỂN DỤNG ĐANG MỞ:")
                for j in jobs:
                    if j['salary_min'] and j['salary_max']:
                        sal = f"{j['salary_min']//1000000}–{j['salary_max']//1000000} triệu"
                    elif j['salary_negotiable']:
                        sal = "Thỏa thuận"
                    else:
                        sal = "Chưa cập nhật"
                    jtype = {"full-time": "Toàn thời gian", "part-time": "Bán thời gian",
                             "internship": "Thực tập", "remote": "Làm từ xa"}.get(j['job_type'], j['job_type'])
                    vip = "⭐ " if j.get('is_vip') else ""
                    context_parts.append(
                        f"  • {vip}{j['title']} — {j['company_name']} | "
                        f"📍{j['location'] or 'Chưa cập nhật'} | {jtype} | 💰{sal}"
                        + (f" | {j['category_name']}" if j.get('category_name') else "")
                    )

        if intents & {'company', 'stats'}:
            cur.execute("""
                SELECT company_name, address, description, scale
                FROM companies WHERE status = 'approved'
                ORDER BY created_at DESC LIMIT 8
            """)
            companies = cur.fetchall()
            raw_data['companies'] = companies
            if companies:
                context_parts.append("\n🏢 CÔNG TY ĐANG TUYỂN:")
                for c in companies:
                    desc = (c['description'] or '')[:100]
                    context_parts.append(
                        f"  • {c['company_name']} | 📍{c['address'] or 'Chưa cập nhật'}"
                        f" | Quy mô: {c['scale'] or 'Chưa cập nhật'}"
                        + (f"\n    {desc}" if desc else "")
                    )

        if intents & {'category', 'stats'}:
            cur.execute("""
                SELECT cat.name, COUNT(j.id) AS job_count
                FROM categories cat
                LEFT JOIN jobs j ON j.category_id = cat.id AND j.status='active'
                GROUP BY cat.id, cat.name ORDER BY job_count DESC
            """)
            cats = cur.fetchall()
            raw_data['categories'] = cats
            if cats:
                context_parts.append("\n🏷️ NGÀNH NGHỀ:")
                for cat in cats:
                    context_parts.append(f"  • {cat['name']}: {cat['job_count']} tin")

    except Exception as e:
        print(f"DB error: {e}")
        return "", {}
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
    return '\n'.join(context_parts), raw_data

def score_to_label(score):
    if score >= 0.75: return "Rất phù hợp"
    if score >= 0.55: return "Phù hợp"
    if score >= 0.35: return "Có thể xem xét"
    return "Ít phù hợp"

def lexical_match_scores(source_text, target_texts):
    documents = [str(source_text)] + [str(text) for text in target_texts]
    try:
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=12000,
            sublinear_tf=True,
            strip_accents="unicode"
        )
        matrix = vectorizer.fit_transform(documents)
        lexical_scores = cosine_similarity(matrix[0:1], matrix[1:])[0]
    except ValueError:
        lexical_scores = np.zeros(len(target_texts))

    all_skills = analyzer_data.get("all_tech_skills", {})
    source_skills = set(extract_skills_simple(source_text, all_skills))
    scores = []
    for index, target_text in enumerate(target_texts):
        target_skills = set(extract_skills_simple(target_text, all_skills))
        if target_skills:
            skill_coverage = len(source_skills & target_skills) / len(target_skills)
            score = 0.7 * float(lexical_scores[index]) + 0.3 * skill_coverage
        else:
            score = min(1.0, float(lexical_scores[index]) * 1.25)
        scores.append(max(0.0, min(1.0, score)))
    return np.asarray(scores)

def calculate_match_scores(source_text, target_texts):
    if matching_model is not None and util is not None:
        try:
            source_emb = matching_model.encode(str(source_text)[:6000], convert_to_tensor=True)
            target_embs = matching_model.encode(
                [str(text)[:6000] for text in target_texts],
                convert_to_tensor=True
            )
            return util.cos_sim(source_emb, target_embs)[0].cpu().numpy(), "sentence_transformer"
        except Exception as exc:
            print(f"Matching inference error; dung TF-IDF fallback: {exc}")
    return lexical_match_scores(source_text, target_texts), "tfidf_skill_fallback"

def retrieve_faq_context(question, top_k=4, min_score=0.08):
    if rag_vectorizer is None or rag_matrix is None or not rag_documents:
        return "", []

    qvec = rag_vectorizer.transform([question.lower()])
    sims = cosine_similarity(qvec, rag_matrix)[0]
    top_indexes = np.argsort(sims)[::-1][:top_k]
    matches = []
    for idx in top_indexes:
        score = float(sims[idx])
        if score < min_score:
            continue
        doc = rag_documents[int(idx)]
        matches.append({
            "id": doc["id"],
            "source": doc["source"],
            "score": round(score, 3),
            "question": doc["question"],
            "answer": doc["answer"],
            "content": doc["content"]
        })

    context = "\n\n".join(
        f"[{m['id']} | score={m['score']}]\n{m['content']}"
        for m in matches
    )
    return context, matches

def build_rag_context(question):
    db_context_text, raw_data = fetch_db_context(question)
    faq_context_text, faq_matches = retrieve_faq_context(question)
    context_parts = []

    if db_context_text:
        context_parts.append("NGUỒN DB JOBLINK REALTIME:\n" + db_context_text)
    if faq_context_text:
        context_parts.append("NGUỒN FAQ NỘI BỘ:\n" + faq_context_text)
    if not context_parts:
        context_parts.append("Không có ngữ cảnh nội bộ phù hợp.")

    sources = []
    if db_context_text:
        sources.append({"source": "joblink_db", "type": "database"})
    sources.extend({
        "source": m["source"],
        "id": m["id"],
        "score": m["score"],
        "question": m["question"]
    } for m in faq_matches)

    return "\n\n---\n\n".join(context_parts), sources, raw_data, faq_matches

def normalize_chat_history(history):
    messages = []
    if not isinstance(history, list):
        return messages

    for h in history[-8:]:
        role = h.get("role", "user")
        content = str(h.get("content", "")).strip()[:800]
        if not content:
            continue
        if role == "assistant":
            role = "assistant"
        else:
            role = "user"
        messages.append({"role": role, "content": content})
    return messages

def ask_groq_rag(question, history):
    rag_context, sources, raw_data, faq_matches = build_rag_context(question)
    system_prompt = """Bạn là AI tư vấn nghề nghiệp của JobLink, nền tảng tuyển dụng Việt Nam.

Nhiệm vụ:
1. Trả lời ngắn gọn, thân thiện, bằng tiếng Việt.
2. Ưu tiên thông tin trong NGỮ CẢNH RAG: dữ liệu DB JobLink realtime và FAQ nội bộ.
3. Khi giới thiệu việc làm, nếu có dữ liệu thì nêu rõ tên việc, công ty, lương, địa điểm.
4. Nếu ngữ cảnh không đủ, nói rõ mình chưa có dữ liệu nội bộ và chỉ đưa ra gợi ý chung.
5. Nếu câu hỏi không liên quan nghề nghiệp, việc làm, CV, phỏng vấn, công ty hoặc JobLink, lịch sự từ chối.
6. Không bịa đặt số liệu, công ty, tin tuyển dụng hoặc mức lương không có trong ngữ cảnh."""

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(normalize_chat_history(history))
    messages.append({
        "role": "user",
        "content": f"NGỮ CẢNH RAG:\n{rag_context}\n\nCÂU HỎI NGƯỜI DÙNG:\n{question}"
    })

    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.25,
        max_tokens=800
    )
    reply = response.choices[0].message.content
    return reply, sources, faq_matches

def fallback_rag_answer(question, unavailable_reason=None):
    _, sources, raw_data, faq_matches = build_rag_context(question)
    if faq_matches and faq_matches[0]["score"] >= 0.12:
        return {
            "reply": faq_matches[0]["answer"],
            "found": True,
            "confidence": faq_matches[0]["score"],
            "source": "rag_faq_fallback",
            "sources": sources
        }

    unavailable_hint = unavailable_reason or (
        "Groq chưa phản hồi; chatbot đang dùng dữ liệu FAQ nội bộ."
        if groq_client else
        "Hãy thêm GROQ_API_KEY để chatbot trả lời linh hoạt hơn."
    )
    return {
        "reply": "Xin lỗi, tôi chưa có đủ dữ liệu nội bộ để trả lời câu này. " + unavailable_hint,
        "found": False,
        "confidence": 0,
        "source": "rag_fallback_none",
        "sources": sources
    }

# ── ENDPOINTS ────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    if groq_verified:
        groq_status = "connected"
    elif groq_client:
        groq_status = "configured_unverified"
    else:
        groq_status = "not_configured"
    return jsonify({
        "status": "ok",
        "deployment_mode": "lightweight" if LIGHTWEIGHT_MODE else "full",
        "groq_api": groq_client is not None,
        "groq_status": groq_status,
        "groq_model": GROQ_MODEL if groq_client else None,
        "models": {
            "matching": "loaded" if matching_model else "fallback",
            "matching_backend": matching_backend,
            "analyzer": "loaded" if analyzer_vectorizer else "fallback",
            "chatbot": "groq_rag" if groq_client else ("rag_faq_fallback" if rag_documents else "unavailable"),
            "chatbot_documents": len(rag_documents)
        }
    })

@app.route("/chat", methods=["POST"])
def chat():
    global groq_verified
    data = request.get_json()
    if not data or not data.get("message"):
        return jsonify({"error": "Cần nội dung tin nhắn"}), 400
    message = str(data["message"]).strip()[:500]
    history = data.get("history", [])

    if groq_client:
        try:
            reply, sources, faq_matches = ask_groq_rag(message, history)
            groq_verified = True

            return jsonify({
                "reply": reply,
                "found": True,
                "confidence": 1.0,
                "source": "groq+rag",
                "sources": sources,
                "retrieved": [
                    {"id": m["id"], "score": m["score"], "question": m["question"]}
                    for m in faq_matches
                ]
            })
        except Exception as e:
            groq_verified = False
            print(f"Groq RAG error: {e}")
            reason = "Groq đang bận; chatbot đã chuyển sang dữ liệu FAQ nội bộ."
            return jsonify(fallback_rag_answer(message, reason))

    return jsonify(fallback_rag_answer(message))

@app.route("/match", methods=["POST"])
def match():
    data = request.get_json()
    if not data or not data.get("cv_text") or not data.get("job_text"):
        return jsonify({"error": "Cần nội dung CV và tin tuyển dụng"}), 400
    scores, backend = calculate_match_scores(data["cv_text"], [data["job_text"]])
    sim = float(scores[0])
    return jsonify({
        "score": round(sim * 100, 1),
        "score_raw": round(sim, 4),
        "label": score_to_label(sim),
        "backend": backend
    })

@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.get_json()
    if not data or not data.get("candidate_text") or not data.get("jobs"):
        return jsonify({"error": "Cần thông tin ứng viên và danh sách việc làm"}), 400
    jobs = data["jobs"][:50]
    if not jobs:
        return jsonify({"recommendations": []})
    job_texts = [
        f"{j.get('title', '')} {j.get('description', '')} {j.get('requirements', '')}".strip()
        for j in jobs
    ]
    scores, backend = calculate_match_scores(data["candidate_text"], job_texts)
    results = sorted([
        {"job_id": jobs[i].get("id"), "score": round(float(scores[i]) * 100, 1),
         "label": score_to_label(float(scores[i])), "backend": backend}
        for i in range(len(jobs))
    ], key=lambda x: x["score"], reverse=True)
    return jsonify({"recommendations": results, "backend": backend})

def extract_skills_simple(cv_text, all_skills):
    found, cv_lower = [], cv_text.lower()
    for skill_lower, info in all_skills.items():
        if re.search(r'\b' + re.escape(skill_lower) + r'\b', cv_lower):
            found.append(info["skill"])
    return found

def normalize_search_text(value):
    normalized = unicodedata.normalize("NFD", str(value or ""))
    normalized = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return re.sub(r"\s+", " ", normalized.replace("đ", "d").replace("Đ", "D")).strip().lower()

def extract_target_position(cv_text):
    headings = {"vi tri ung tuyen", "vi tri mong muon", "position applied for", "desired position"}
    lines = [line.strip() for line in str(cv_text).splitlines()]
    for index, line in enumerate(lines):
        normalized = normalize_search_text(line)
        for heading in headings:
            if normalized == heading:
                for candidate in lines[index + 1:]:
                    if candidate:
                        return candidate[:120]
            prefix = heading + ":"
            if normalized.startswith(prefix):
                return line.split(":", 1)[1].strip()[:120]
    return ""

def target_domain_for(position):
    normalized = normalize_search_text(position)
    domain_keywords = {
        "it_data": ["data analyst", "data scientist", "data engineer", "business intelligence", "bi analyst", "machine learning", "ml engineer", "ai engineer"],
        "it_backend": ["backend", "back-end", "software engineer", "full-stack", "full stack", "api developer", "java developer", "python developer", "node.js"],
        "it_frontend": ["frontend", "front-end", "ui developer", "react developer", "web designer"],
        "it_devops": ["devops", "site reliability", "sre", "cloud engineer", "system administrator", "infrastructure"],
        "marketing": ["marketing", "seo", "content creator", "brand"],
        "accounting": ["ke toan", "kiem toan", "tai chinh"],
        "sales": ["sales", "kinh doanh", "account manager", "business development"],
        "hr": ["nhan su", "tuyen dung", "human resources", "hr"]
    }
    return next((domain for domain, keywords in domain_keywords.items()
                 if any(keyword in normalized for keyword in keywords)), None)

def suggest_titles_for_cv(target_position, primary_domains, title_mapping, tech_skills):
    if not primary_domains:
        return [target_position] if target_position else []

    domain = primary_domains[0]
    titles = list(title_mapping.get(domain, []))
    role_skill_hints = {
        "it_data": {
            "Data Analyst": ["python", "pandas", "sql", "power bi", "tableau", "excel"],
            "Data Engineer": ["python", "java", "sql", "hadoop", "hdfs", "spark"],
            "Data Scientist": ["python", "pandas", "numpy", "scikit-learn", "machine learning", "r"],
            "ML Engineer": ["python", "tensorflow", "pytorch", "scikit-learn", "machine learning"],
            "AI Engineer": ["python", "tensorflow", "pytorch", "deep learning", "nlp"]
        }
    }
    normalized_skills = {normalize_search_text(skill) for skill in tech_skills}
    hints = role_skill_hints.get(domain, {})
    if hints:
        scored_titles = [
            (sum(skill in normalized_skills for skill in hints.get(title, [])), title)
            for title in titles
        ]
        titles = [title for score, title in sorted(scored_titles, key=lambda item: -item[0]) if score >= 2]

    result = []
    if target_position:
        result.append(target_position)

    target_normalized = normalize_search_text(target_position)
    titles.sort(key=lambda title: normalize_search_text(title) not in target_normalized)
    for title in titles:
        if normalize_search_text(title) not in {normalize_search_text(item) for item in result}:
            result.append(title)
        if len(result) == 5:
            break
    return result

def predict_exp_simple(cv_text):
    cv_lower = cv_text.lower()
    year_matches = [
        int(value) for value in re.findall(r'\b(\d{1,2})\s*(?:\+\s*)?(?:năm|nam|years?)\b', cv_lower)
    ]
    if year_matches:
        years = max(year_matches)
        if years >= 5:
            return "senior"
        if years >= 3:
            return "middle"
        if years >= 1:
            return "junior"
        return "fresher"
    if any(k in cv_lower for k in ["senior", "chuyên gia", "chuyen gia", "tech lead", "team lead", "manager"]):
        return "senior"
    if "middle" in cv_lower:
        return "middle"
    if "junior" in cv_lower:
        return "junior"
    if any(k in cv_lower for k in ["fresher", "intern", "thực tập", "thuc tap", "mới ra trường", "moi ra truong"]):
        return "fresher"
    return None

@app.route("/analyze-cv", methods=["POST"])
def analyze_cv_endpoint():
    data = request.get_json()
    if not data or not data.get("cv_text"):
        return jsonify({"error": "Cần nội dung CV"}), 400
    cv_text = str(data["cv_text"])[:3000]
    all_skills = analyzer_data.get("all_tech_skills", {})
    soft_skills_list = analyzer_data.get("soft_skills", [])
    title_mapping = analyzer_data.get("title_mapping", {})
    tech_skills = extract_skills_simple(cv_text, all_skills)
    found_soft = [s for s in soft_skills_list if s.lower() in cv_text.lower()]
    explicit_exp_level = predict_exp_simple(cv_text)
    if explicit_exp_level:
        exp_level = explicit_exp_level
        exp_proba = 0.95
    elif analyzer_classifier and analyzer_vectorizer:
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            vec = analyzer_vectorizer.transform([cv_text])
            exp_level = analyzer_classifier.predict(vec)[0]
            exp_proba = float(analyzer_classifier.predict_proba(vec)[0].max())
    else:
        exp_level = "fresher"
        exp_proba = 0.5
    domain_counts = {}
    for s_lower, info in all_skills.items():
        if info["skill"] in tech_skills:
            d = info["domain"]
            domain_counts[d] = domain_counts.get(d, 0) + 1
    target_position = extract_target_position(cv_text)
    target_domain = target_domain_for(target_position)
    ranked_domains = sorted(domain_counts, key=lambda d: domain_counts[d], reverse=True)
    if target_domain:
        ranked_domains = [target_domain] + [domain for domain in ranked_domains if domain != target_domain]
    primary_domains = ranked_domains[:2]
    if primary_domains:
        skill_domains = {info["skill"]: info["domain"] for info in all_skills.values()}
        tech_skills.sort(key=lambda skill: skill_domains.get(skill) != primary_domains[0])
    suggested_titles = suggest_titles_for_cv(target_position, primary_domains, title_mapping, tech_skills)
    exp_label_map = {"fresher": "Fresher", "junior": "Junior (1-2 năm)",
                     "middle": "Middle (3-5 năm)", "senior": "Senior (5+ năm)"}
    domain_label_map = {"it_backend": "Lập trình Backend", "it_frontend": "Lập trình Frontend",
                        "it_data": "Data/AI", "it_devops": "DevOps", "marketing": "Marketing",
                        "accounting": "Kế toán", "sales": "Kinh doanh", "hr": "Nhân sự"}
    domain_name = domain_label_map.get(primary_domains[0], "Đa ngành") if primary_domains else "Chưa xác định"
    top5 = tech_skills[:5]
    summary = (f"Ứng viên cấp độ {exp_label_map.get(exp_level, exp_level)}, "
               f"chuyên ngành {domain_name}. "
               f"Kỹ năng nổi bật: {', '.join(top5) if top5 else 'chưa xác định'}. "
               f"Tìm thấy {len(tech_skills)} kỹ năng từ CV.")
    return jsonify({
        "tech_skills": tech_skills, "soft_skills": found_soft,
        "experience_level": exp_level, "exp_confidence": exp_proba,
        "primary_domains": primary_domains, "suggested_titles": suggested_titles,
        "target_position": target_position,
        "summary": summary, "skill_count": len(tech_skills)
    })

if __name__ == "__main__":
    print("=" * 50)
    port = int(os.getenv("PORT", "5000"))
    print(f"JobLink AI Service — Port {port}")
    print(f"Groq API: {'✅ Kich hoat' if groq_client else '❌ Chua co — them GROQ_API_KEY vao .env'}")
    print(f"Chatbot RAG docs: {len(rag_documents)}")
    print("=" * 50)
    app.run(host="0.0.0.0", port=port, debug=False)
