import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from services.auth_dependency import get_current_user
from services.postgres_db import get_db_connection

router = APIRouter()


class SurveyCreate(BaseModel):
    course_id: int
    title: str = Field(..., min_length=3, max_length=180)
    description: str = Field(default="", max_length=2000)
    questions: list[dict] = Field(..., min_length=1, max_length=30)


class SurveyResponseCreate(BaseModel):
    answers: list[dict] = Field(..., min_length=1, max_length=30)


def init_survey_db():
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS course_surveys (
                    id SERIAL PRIMARY KEY,
                    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    questions JSONB NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_course_surveys_company_course
                ON course_surveys(company_id, course_id, created_at DESC)
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS course_survey_responses (
                    id SERIAL PRIMARY KEY,
                    survey_id INTEGER NOT NULL REFERENCES course_surveys(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    answers JSONB NOT NULL,
                    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(survey_id, user_id)
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_survey_responses_survey
                ON course_survey_responses(survey_id, submitted_at DESC)
            """)


def _role(user, allowed):
    role = user.get("role")
    if role not in allowed:
        raise HTTPException(status_code=403, detail="You do not have permission to manage surveys.")
    return role


def _company_id(user):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=403, detail="Your account is not associated with a company.")
    return int(company_id)


def _validate_questions(questions):
    normalized = []
    for index, question in enumerate(questions):
        if not isinstance(question, dict):
            raise HTTPException(status_code=422, detail=f"Question {index + 1} is invalid.")
        prompt = str(question.get("prompt", "")).strip()
        kind = question.get("type", "text")
        if not prompt or len(prompt) > 500 or kind not in {"text", "rating", "choice"}:
            raise HTTPException(status_code=422, detail=f"Question {index + 1} is invalid.")
        item = {"id": str(question.get("id") or index + 1), "prompt": prompt, "type": kind}
        if kind == "choice":
            options = question.get("options")
            if not isinstance(options, list) or len(options) < 2 or len(options) > 10:
                raise HTTPException(status_code=422, detail=f"Question {index + 1} needs 2 to 10 options.")
            clean_options = [str(option).strip()[:160] for option in options if str(option).strip()]
            if len(clean_options) < 2:
                raise HTTPException(status_code=422, detail=f"Question {index + 1} needs at least two valid options.")
            item["options"] = clean_options
        normalized.append(item)
    return normalized


@router.get("/api/surveys")
def list_surveys(current_user=Depends(get_current_user)):
    role = current_user.get("role")
    company_id = _company_id(current_user)
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            if role in {"company_admin", "super_admin"}:
                cursor.execute("""
                    SELECT s.id, s.course_id, c.title, s.title, s.description,
                           s.questions, s.is_active, s.created_at,
                           COUNT(r.id) AS response_count
                    FROM course_surveys s
                    JOIN courses c ON c.id = s.course_id
                    LEFT JOIN course_survey_responses r ON r.survey_id = s.id
                    WHERE s.company_id = %s
                    GROUP BY s.id, c.title
                    ORDER BY s.created_at DESC
                """, (company_id,))
                rows = cursor.fetchall()
                return {"surveys": [{
                    "id": row[0], "course_id": row[1], "course_title": row[2],
                    "title": row[3], "description": row[4], "questions": row[5],
                    "is_active": row[6], "created_at": row[7].isoformat() if row[7] else None,
                    "response_count": row[8],
                } for row in rows]}
            if role != "employee":
                raise HTTPException(status_code=403, detail="Surveys are available to learners and company admins.")
            cursor.execute("""
                SELECT s.id, s.course_id, c.title, s.title, s.description,
                       s.questions, s.created_at,
                       EXISTS(SELECT 1 FROM course_survey_responses r
                              WHERE r.survey_id = s.id AND r.user_id = %s) AS submitted
                FROM course_surveys s
                JOIN courses c ON c.id = s.course_id
                JOIN enrollments e ON e.course_id = s.course_id AND e.user_id = %s
                WHERE s.company_id = %s AND s.is_active = TRUE
                ORDER BY s.created_at DESC
            """, (current_user["user_id"], current_user["user_id"], company_id))
            rows = cursor.fetchall()
    return {"surveys": [{
        "id": row[0], "course_id": row[1], "course_title": row[2],
        "title": row[3], "description": row[4], "questions": row[5],
        "created_at": row[6].isoformat() if row[6] else None, "submitted": row[7],
    } for row in rows]}


@router.post("/api/surveys")
def create_survey(data: SurveyCreate, current_user=Depends(get_current_user)):
    _role(current_user, {"company_admin"})
    company_id = _company_id(current_user)
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Survey title is required.")
    questions = _validate_questions(data.questions)
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 FROM courses WHERE id = %s AND company_id = %s", (data.course_id, company_id))
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Course not found.")
            cursor.execute("""
                INSERT INTO course_surveys(company_id, course_id, created_by, title, description, questions)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                RETURNING id
            """, (company_id, data.course_id, current_user["user_id"], title,
                  data.description.strip(), json.dumps(questions)))
            survey_id = cursor.fetchone()[0]
    return {"success": True, "survey_id": survey_id}


@router.post("/api/surveys/{survey_id}/responses")
def submit_survey_response(survey_id: int, data: SurveyResponseCreate, current_user=Depends(get_current_user)):
    _role(current_user, {"employee"})
    user_id = int(current_user["user_id"])
    company_id = _company_id(current_user)
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT s.questions
                FROM course_surveys s
                JOIN enrollments e ON e.course_id = s.course_id AND e.user_id = %s
                WHERE s.id = %s AND s.company_id = %s AND s.is_active = TRUE
            """, (user_id, survey_id, company_id))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Survey not found or you are not enrolled in its course.")
            questions = row[0]
            if isinstance(questions, str):
                questions = json.loads(questions)
            by_id = {str(q["id"]): q for q in questions}
            answers = {}
            for answer in data.answers:
                question_id = str(answer.get("question_id", ""))
                question = by_id.get(question_id)
                if not question:
                    raise HTTPException(status_code=422, detail="An answer references an unknown question.")
                value = str(answer.get("answer", "")).strip()
                if not value:
                    raise HTTPException(status_code=422, detail="Please answer every survey question.")
                if question["type"] == "rating":
                    if value not in {"1", "2", "3", "4", "5"}:
                        raise HTTPException(status_code=422, detail="Ratings must be between 1 and 5.")
                if question["type"] == "choice" and value not in question.get("options", []):
                    raise HTTPException(status_code=422, detail="Please select a valid option.")
                answers[question_id] = value
            if len(answers) != len(questions):
                raise HTTPException(status_code=422, detail="Please answer every survey question.")
            try:
                cursor.execute("""
                    INSERT INTO course_survey_responses(survey_id, user_id, answers)
                    VALUES (%s, %s, %s::jsonb)
                """, (survey_id, user_id, json.dumps(answers)))
            except Exception as exc:
                if getattr(exc, "pgcode", None) == "23505":
                    raise HTTPException(status_code=409, detail="You have already submitted this survey.")
                raise
    return {"success": True, "message": "Your feedback has been submitted."}


@router.get("/api/surveys/{survey_id}/results")
def get_survey_results(survey_id: int, current_user=Depends(get_current_user)):
    _role(current_user, {"company_admin"})
    company_id = _company_id(current_user)
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT s.title, s.questions, c.title,
                       r.answers, r.submitted_at, u.name, u.email
                FROM course_surveys s
                JOIN courses c ON c.id = s.course_id
                LEFT JOIN course_survey_responses r ON r.survey_id = s.id
                LEFT JOIN users u ON u.id = r.user_id
                WHERE s.id = %s AND s.company_id = %s
                ORDER BY r.submitted_at DESC
            """, (survey_id, company_id))
            rows = cursor.fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="Survey not found.")
    questions = rows[0][1]
    if isinstance(questions, str):
        questions = json.loads(questions)
    return {
        "title": rows[0][0],
        "course_title": rows[0][2],
        "questions": questions,
        "responses": [{
            "answers": row[3], "submitted_at": row[4].isoformat() if row[4] else None,
            "learner_name": row[5], "learner_email": row[6],
        } for row in rows if row[3] is not None],
    }


@router.patch("/api/surveys/{survey_id}/status")
def update_survey_status(survey_id: int, is_active: bool, current_user=Depends(get_current_user)):
    _role(current_user, {"company_admin"})
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE course_surveys SET is_active = %s
                WHERE id = %s AND company_id = %s RETURNING id
            """, (is_active, survey_id, _company_id(current_user)))
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Survey not found.")
    return {"success": True, "is_active": is_active}
