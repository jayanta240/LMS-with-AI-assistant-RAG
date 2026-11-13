from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from services.auth_dependency import get_current_user
from services.postgres_db import get_db_connection


router = APIRouter()


class LearnerNoteCreate(BaseModel):
    course_id: int
    lesson_id: int
    content: str = Field(..., min_length=1, max_length=20000)


def _learner_id(current_user):
    if current_user.get("role") != "employee":
        raise HTTPException(status_code=403, detail="Only learners can manage notes.")
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authenticated user.")
    return int(user_id)


def init_learner_notes_db():
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS learner_notes (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                    lesson_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (user_id, course_id, lesson_id)
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_learner_notes_user_course
                ON learner_notes (user_id, course_id)
            """)


def _ensure_lesson_enrollment(cursor, user_id, course_id, lesson_id):
    cursor.execute("""
        SELECT 1
        FROM enrollments e
        JOIN lessons l ON l.course_id = e.course_id
        WHERE e.user_id = %s
          AND e.course_id = %s
          AND l.id = %s
        LIMIT 1
    """, (user_id, course_id, lesson_id))
    if cursor.fetchone() is None:
        raise HTTPException(
            status_code=403,
            detail="You can add notes only to lessons in courses assigned to you.",
        )


@router.get("/api/learner-notes")
def get_learner_note(
    course_id: int,
    lesson_id: int,
    current_user=Depends(get_current_user),
):
    user_id = _learner_id(current_user)
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            _ensure_lesson_enrollment(cursor, user_id, course_id, lesson_id)
            cursor.execute("""
                SELECT id, course_id, lesson_id, content, created_at, updated_at
                FROM learner_notes
                WHERE user_id = %s AND course_id = %s AND lesson_id = %s
            """, (user_id, course_id, lesson_id))
            row = cursor.fetchone()

    if not row:
        return {"note": None}
    return {
        "note": {
            "id": row[0],
            "course_id": row[1],
            "lesson_id": row[2],
            "content": row[3],
            "created_at": row[4].isoformat() if row[4] else None,
            "updated_at": row[5].isoformat() if row[5] else None,
        }
    }


@router.post("/api/learner-notes")
def save_learner_note(
    data: LearnerNoteCreate,
    current_user=Depends(get_current_user),
):
    user_id = _learner_id(current_user)
    content = data.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="Note content cannot be empty.")

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            _ensure_lesson_enrollment(cursor, user_id, data.course_id, data.lesson_id)
            cursor.execute("""
                INSERT INTO learner_notes (user_id, course_id, lesson_id, content)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_id, course_id, lesson_id)
                DO UPDATE SET
                    content = EXCLUDED.content,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, created_at, updated_at
            """, (user_id, data.course_id, data.lesson_id, content))
            row = cursor.fetchone()

    return {
        "success": True,
        "note": {
            "id": row[0],
            "course_id": data.course_id,
            "lesson_id": data.lesson_id,
            "content": content,
            "created_at": row[1].isoformat() if row[1] else None,
            "updated_at": row[2].isoformat() if row[2] else None,
        },
    }


@router.delete("/api/learner-notes/{note_id}")
def delete_learner_note(
    note_id: int,
    current_user=Depends(get_current_user),
):
    user_id = _learner_id(current_user)
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                DELETE FROM learner_notes
                WHERE id = %s AND user_id = %s
                RETURNING id
            """, (note_id, user_id))
            deleted = cursor.fetchone()

    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found.")
    return {"success": True, "note_id": note_id}
