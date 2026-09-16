from datetime import datetime

from services.postgres_db import get_db_connection


# ============================================================
# ASSIGN COURSE
# ============================================================

def assign_course(
    user_id,
    course_id
):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                INSERT INTO enrollments
                (
                    user_id,
                    course_id,
                    assigned_at
                )
                VALUES (%s, %s, %s)
            """, (
                user_id,
                course_id,
                datetime.now(),
            ))


# ============================================================
# GET USER COURSES
# ============================================================

def get_user_courses(user_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT

                    c.id,
                    c.title,
                    c.description,

                    COUNT(DISTINCT l.id) AS total_lessons,

                    COUNT(DISTINCT lp.lesson_id)
                        AS completed_lessons

                FROM enrollments e

                JOIN courses c
                    ON c.id = e.course_id

                LEFT JOIN lessons l
                    ON l.course_id = c.id

                LEFT JOIN lesson_progress lp
                    ON lp.lesson_id = l.id
                   AND lp.user_id = e.user_id
                   AND lp.completed = 1

                WHERE e.user_id = %s

                GROUP BY
                    c.id,
                    c.title,
                    c.description

                ORDER BY c.id DESC
            """, (
                user_id,
            ))

            rows = cursor.fetchall()

    result = []

    for row in rows:

        total = row[3]
        completed = row[4]

        progress = 0

        if total > 0:
            progress = int(
                (completed / total) * 100
            )

        result.append({
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "total_lessons": total,
            "completed_lessons": completed,
            "progress": progress,
        })

    return result


# ============================================================
# GET USER COURSE IDS
# ============================================================

def get_user_course_ids(user_id):
    """
    Return only the course IDs assigned to a user.
    Used by the RAG access-control layer.
    """

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT course_id
                FROM enrollments
                WHERE user_id = %s
                ORDER BY course_id
            """, (
                user_id,
            ))

            rows = cursor.fetchall()

    return [
        row[0]
        for row in rows
    ]