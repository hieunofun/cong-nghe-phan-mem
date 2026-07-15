# ai_service/app.py
import os
import json
import re
import joblib
import numpy as np
from groq import Groq
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

try:
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

import pymysql
import pymysql.cursors

def get_db():
    return pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'joblink_db'),
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5
    )

# ── GROQ API ─────────────────────────────────────────────────
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
groq_client = None
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
if SENTENCE_TRANSFORMERS_AVAILABLE and os.path.exists(MATCHING_PATH):
    try:
        matching_model = SentenceTransformer(MATCHING_PATH)
        print("  ✅ CV-Job Matching model da tai")
    except Exception as exc:
        print(f"  ⚠️  Khong the tai CV-Job Matching model: {exc}")
elif SENTENCE_TRANSFORMERS_AVAILABLE:
    try:
        print("  ⚠️  Dung model mac dinh chua fine-tune")
        matching_model = SentenceTransformer("paraphrase-multilingual-mpnet-base-v2")
    except Exception as exc:
        print(f"  ⚠️  Khong the tai model CV mac dinh: {exc}")
else:
    print("  ⚠️  Bo qua CV-Job Matching; chatbot RAG van hoat dong")

analyzer_vectorizer = analyzer_classifier = None
analyzer_data = {}
vec_p = os.path.join(MODELS_DIR, "cv_analyzer", "exp_vectorizer.pkl")
clf_p = os.path.join(MODELS_DIR, "cv_analyzer", "exp_classifier.pkl")
dat_p = os.path.join(MODELS_DIR, "cv_analyzer", "analyzer_data.json")
if all(os.path.exists(p) for p in [vec_p, clf_p, dat_p]):
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        analyzer_vectorizer = joblib.load(vec_p)
        analyzer_classifier = joblib.load(clf_p)
    with open(dat_p, encoding='utf-8') as f:
        analyzer_data = json.load(f)
    print("  ✅ CV Analyzer da tai")
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
            "content": f"Cau hoi mau: {question}\nCau tra loi tham khao: {answer}"
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
    context_parts = []
    raw_data = {}
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

        cur.close()
        conn.close()
    except Exception as e:
        print(f"DB error: {e}")
        context_parts.append("(Không thể kết nối DB)")
    return '\n'.join(context_parts), raw_data

def score_to_label(score):
    if score >= 0.75: return "Rất phù hợp"
    if score >= 0.55: return "Phù hợp"
    if score >= 0.35: return "Có thể xem xét"
    return "Ít phù hợp"

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
        context_parts.append("NGUON DB JOBLINK REALTIME:\n" + db_context_text)
    if faq_context_text:
        context_parts.append("NGUON FAQ NOI BO:\n" + faq_context_text)
    if not context_parts:
        context_parts.append("Khong co ngu canh noi bo phu hop.")

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
    system_prompt = """Ban la AI tu van nghe nghiep cua JobLink, nen tang tuyen dung Viet Nam.

Nhiem vu:
1. Tra loi ngan gon, than thien, bang tieng Viet.
2. Uu tien thong tin trong NGU CANH RAG: du lieu DB JobLink realtime va FAQ noi bo.
3. Khi gioi thieu viec lam, neu co du lieu thi neu ro ten viec, cong ty, luong, dia diem.
4. Neu ngu canh khong du, noi ro minh chua co du lieu noi bo va chi dua ra goi y chung.
5. Neu cau hoi khong lien quan nghe nghiep, viec lam, CV, phong van, cong ty hoac JobLink, lich su tu choi.
6. Khong bia dat so lieu, cong ty, tin tuyen dung hoac muc luong khong co trong ngu canh."""

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(normalize_chat_history(history))
    messages.append({
        "role": "user",
        "content": f"NGU CANH RAG:\n{rag_context}\n\nCAU HOI NGUOI DUNG:\n{question}"
    })

    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.25,
        max_tokens=800
    )
    reply = response.choices[0].message.content
    return reply, sources, faq_matches

def fallback_rag_answer(question):
    _, sources, raw_data, faq_matches = build_rag_context(question)
    if faq_matches and faq_matches[0]["score"] >= 0.12:
        return {
            "reply": faq_matches[0]["answer"],
            "found": True,
            "confidence": faq_matches[0]["score"],
            "source": "rag_faq_fallback",
            "sources": sources
        }

    unavailable_hint = (
        "Groq hiện không phản hồi từ môi trường này (403 Access denied); hãy kiểm tra hoặc tạo lại API key."
        if groq_client else
        "Hãy thêm GROQ_API_KEY vào file .env để chatbot RAG dùng Groq trả lời linh hoạt hơn."
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
    return jsonify({
        "status": "ok",
        "groq_api": groq_client is not None,
        "groq_model": GROQ_MODEL if groq_client else None,
        "models": {
            "matching": "loaded" if matching_model else "unavailable",
            "analyzer": "loaded" if analyzer_vectorizer else "fallback",
            "chatbot": "groq_rag" if groq_client else ("rag_faq_fallback" if rag_documents else "unavailable"),
            "chatbot_documents": len(rag_documents)
        }
    })

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    if not data or not data.get("message"):
        return jsonify({"error": "Can message"}), 400
    message = str(data["message"]).strip()[:500]
    history = data.get("history", [])

    if groq_client:
        try:
            reply, sources, faq_matches = ask_groq_rag(message, history)

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
            print(f"Groq RAG error: {e}")
            if "429" in str(e) or "quota" in str(e).lower():
                return jsonify({
                    "reply": "AI đang bận, vui lòng thử lại sau vài giây.",
                    "found": False,
                    "confidence": 0,
                    "source": "rate_limit"
                })

    return jsonify(fallback_rag_answer(message))

@app.route("/match", methods=["POST"])
def match():
    data = request.get_json()
    if not data or not data.get("cv_text") or not data.get("job_text"):
        return jsonify({"error": "Can cv_text va job_text"}), 400
    if matching_model is None:
        return jsonify({"error": "CV matching model chua san sang"}), 503
    cv_emb = matching_model.encode(str(data["cv_text"])[:2000], convert_to_tensor=True)
    job_emb = matching_model.encode(str(data["job_text"])[:2000], convert_to_tensor=True)
    sim = float(util.cos_sim(cv_emb, job_emb))
    return jsonify({"score": round(sim*100, 1), "score_raw": round(sim, 4), "label": score_to_label(sim)})

@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.get_json()
    if not data or not data.get("candidate_text") or not data.get("jobs"):
        return jsonify({"error": "Can candidate_text va jobs"}), 400
    if matching_model is None:
        return jsonify({"error": "CV matching model chua san sang"}), 503
    cand_emb = matching_model.encode(str(data["candidate_text"])[:2000], convert_to_tensor=True)
    jobs = data["jobs"][:50]
    if not jobs:
        return jsonify({"recommendations": []})
    job_embs = matching_model.encode(
        [f"{j.get('title', '')} {j.get('description', '')}".strip()[:500] for j in jobs],
        convert_to_tensor=True
    )
    scores = util.cos_sim(cand_emb, job_embs)[0].cpu().numpy()
    results = sorted([
        {"job_id": jobs[i].get("id"), "score": round(float(scores[i]) * 100, 1),
         "label": score_to_label(float(scores[i]))}
        for i in range(len(jobs))
    ], key=lambda x: x["score"], reverse=True)
    return jsonify({"recommendations": results})

def extract_skills_simple(cv_text, all_skills):
    found, cv_lower = [], cv_text.lower()
    for skill_lower, info in all_skills.items():
        if re.search(r'\b' + re.escape(skill_lower) + r'\b', cv_lower):
            found.append(info["skill"])
    return found

def predict_exp_simple(cv_text):
    cv_lower = cv_text.lower()
    if any(k in cv_lower for k in ["senior", "5 năm", "6 năm", "chuyên gia", "lead"]):
        return "senior"
    if any(k in cv_lower for k in ["3 năm", "4 năm", "middle"]):
        return "middle"
    if any(k in cv_lower for k in ["1 năm", "2 năm", "junior"]):
        return "junior"
    return "fresher"

@app.route("/analyze-cv", methods=["POST"])
def analyze_cv_endpoint():
    data = request.get_json()
    if not data or not data.get("cv_text"):
        return jsonify({"error": "Can cv_text"}), 400
    cv_text = str(data["cv_text"])[:3000]
    all_skills = analyzer_data.get("all_tech_skills", {})
    soft_skills_list = analyzer_data.get("soft_skills", [])
    title_mapping = analyzer_data.get("title_mapping", {})
    tech_skills = extract_skills_simple(cv_text, all_skills)
    found_soft = [s for s in soft_skills_list if s.lower() in cv_text.lower()]
    if analyzer_classifier and analyzer_vectorizer:
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            vec = analyzer_vectorizer.transform([cv_text])
            exp_level = analyzer_classifier.predict(vec)[0]
            exp_proba = float(analyzer_classifier.predict_proba(vec)[0].max())
    else:
        exp_level = predict_exp_simple(cv_text)
        exp_proba = 0.7
    domain_counts = {}
    for s_lower, info in all_skills.items():
        if info["skill"] in tech_skills:
            d = info["domain"]
            domain_counts[d] = domain_counts.get(d, 0) + 1
    primary_domains = sorted(domain_counts, key=lambda d: domain_counts[d], reverse=True)[:2]
    suggested_titles = list(set(t for d in primary_domains for t in title_mapping.get(d, [])[:3]))[:5]
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
        "summary": summary, "skill_count": len(tech_skills)
    })

if __name__ == "__main__":
    print("=" * 50)
    print("JobLink AI Service — Port 5000")
    print(f"Groq API: {'✅ Kich hoat' if groq_client else '❌ Chua co — them GROQ_API_KEY vao .env'}")
    print(f"Chatbot RAG docs: {len(rag_documents)}")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=False)
