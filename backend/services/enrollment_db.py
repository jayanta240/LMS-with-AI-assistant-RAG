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
                    COALESCE(lesson_counts.total_lessons, 0)
                        + COALESCE(scorm_counts.total_packages, 0) AS total_lessons,
                    COALESCE(lesson_progress.completed_lessons, 0)
                        + COALESCE(scorm_progress.completed_packages, 0) AS completed_lessons
                FROM enrollments e
                JOIN courses c ON c.id = e.course_id
                LEFT JOIN (
                    SELECT course_id, COUNT(*) AS total_lessons
                    FROM lessons
                    GROUP BY course_id
                ) lesson_counts ON lesson_counts.course_id = c.id
                LEFT JOIN (
                    SELECT course_id, COUNT(*) AS total_packages
                    FROM scorm_packages
                    GROUP BY course_id
                ) scorm_counts ON scorm_counts.course_id = c.id
                LEFT JOIN (
                    SELECT user_id, course_id, COUNT(DISTINCT lesson_id) AS completed_lessons
                    FROM lesson_progress
                    WHERE completed = 1
                    GROUP BY user_id, course_id
                ) lesson_progress ON lesson_progress.user_id = e.user_id
                                  AND lesson_progress.course_id = c.id
                LEFT JOIN (
                    SELECT a.user_id, p.course_id, COUNT(DISTINCT a.package_id) AS completed_packages
                    FROM scorm_attempts a
                    JOIN scorm_packages p ON p.id = a.package_id
                    WHERE a.completion_status IN ('completed', 'passed')
                      AND a.success_status <> 'failed'
                    GROUP BY a.user_id, p.course_id
                ) scorm_progress ON scorm_progress.user_id = e.user_id
                                 AND scorm_progress.course_id = c.id
                WHERE e.user_id = %s
                GROUP BY c.id, c.title, c.description,
                         lesson_counts.total_lessons, scorm_counts.total_packages,
                         lesson_progress.completed_lessons, scorm_progress.completed_packages
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