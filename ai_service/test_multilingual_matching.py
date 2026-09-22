import os
import unittest

os.environ.setdefault("AI_LIGHTWEIGHT_MODE", "true")

from ai_service.app import analyzer_data, calculate_match_scores, extract_skills_simple


class MultilingualMatchingTests(unittest.TestCase):
    def assert_good_match(self, cv_text, job_text):
        scores, backend = calculate_match_scores(cv_text, [job_text])
        self.assertGreaterEqual(float(scores[0]), 0.50)
        self.assertIn("multilingual", backend)

    def test_vietnamese_cv_matches_english_job(self):
        self.assert_good_match(
            "Kỹ sư phần mềm Backend có 3 năm kinh nghiệm. Thành thạo Python, "
            "Django, PostgreSQL, Docker và REST API. Giao tiếp tốt, làm việc nhóm.",
            "Backend Software Engineer with 3 years of experience in Python, Django, "
            "PostgreSQL, Docker and REST APIs. Strong communication and teamwork required.",
        )

    def test_english_cv_matches_vietnamese_job(self):
        self.assert_good_match(
            "Data Analyst with 4 years of experience. Proficient in Python, Pandas, SQL, "
            "Power BI and machine learning. Strong teamwork and problem-solving skills.",
            "Tuyển chuyên viên phân tích dữ liệu có 3-5 năm kinh nghiệm, thành thạo Python, "
            "Pandas, SQL, Power BI và học máy. Yêu cầu làm việc nhóm và phân tích vấn đề.",
        )

    def test_english_aliases_are_extracted_as_known_skills(self):
        skills = extract_skills_simple(
            "Recruitment, talent acquisition, customer service and negotiation.",
            analyzer_data["all_tech_skills"],
        )
        self.assertIn("Tuyển dụng", skills)
        self.assertIn("Chăm sóc khách hàng", skills)
        self.assertIn("Đàm phán", skills)


if __name__ == "__main__":
    unittest.main()
