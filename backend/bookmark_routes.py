from fastapi import APIRouter, Depends, HTTPException

from services.auth_dependency import get_current_user
from services.postgres_db import get_db_connection


router = APIRouter()


def init_bookmark_db():
    """Create the learner bookmark table if it does not already exist."""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS course_bookmarks (
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, course_id)
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_course_bookmarks_user_created
                ON course_bookmarks (user_id, created_at DESC)
            """)


def _require_learner(current_user):
    if current_user.get("role") != "employee":
        raise HTTPException(
            status_code=403,
            detail="Only learners can manage course bookmarks.",
        )
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authenticated user.")
    return user_id


@router.get("/api/bookmarks")
def get_my_bookmarks(current_user=Depends(get_current_user)):
    user_id = _require_learner(current_user)

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT c.id
                FROM course_bookmarks cb
                JOIN courses c ON c.id = cb.course_id
                JOIN enrollments e
                  ON e.course_id = cb.course_id
                 AND e.user_id = cb.user_id
                WHERE cb.user_id = %s
                ORDER BY cb.created_at DESC
            """, (user_id,))
            course_ids = [row[0] for row in cursor.fetchall()]

    return {"course_ids": course_ids}


@router.post("/api/courses/{course_id}/bookmark")
def bookmark_course(course_id: int, current_user=Depends(get_current_user)):
    user_id = _require_learner(current_user)

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 1
                FROM enrollments
                WHERE user_id = %s AND course_id = %s
                LIMIT 1
            """, (user_id, course_id))
            if cursor.fetchone() is None:
                raise HTTPException(
                    status_code=403,
                    detail="You can bookmark only courses assigned to you.",
                )

            cursor.execute("""
                INSERT INTO course_bookmarks (user_id, course_id)
                VALUES (%s, %s)
                ON CONFLICT (user_id, course_id) DO NOTHING
            """, (user_id, course_id))

    return {"success": True, "course_id": course_id, "bookmarked": True}


@router.delete("/api/courses/{course_id}/bookmark")
def unbookmark_course(course_id: int, current_user=Depends(get_current_user)):
    user_id = _require_learner(current_user)

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                DELETE FROM course_bookmarks
                WHERE user_id = %s AND course_id = %s
            """, (user_id, course_id))

    return {"success": True, "course_id": course_id, "bookmarked": False}
