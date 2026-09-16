from datetime import datetime

from services.postgres_db import get_db_connection


# ============================================================
# CREATE USER
# ============================================================

def create_user(
    name,
    email,
    password_hash,
    role="employee",
    company_id=None,
    department_id=None
):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                INSERT INTO users
                (
                    name,
                    email,
                    password_hash,
                    role,
                    company_id,
                    department_id,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                name,
                email,
                password_hash,
                role,
                company_id,
                department_id,
                datetime.now(),
            ))

            user_id = cursor.fetchone()[0]

            return user_id


# ============================================================
# GET USER BY EMAIL
# ============================================================

def get_user_by_email(email):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT *
                FROM users
                WHERE email = %s
            """, (
                email,
            ))

            return cursor.fetchone()


# ============================================================
# GET USER BY ID
# ============================================================

def get_user_by_id(user_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT *
                FROM users
                WHERE id = %s
            """, (
                user_id,
            ))

            return cursor.fetchone()


# ============================================================
# GET ALL USERS
# ============================================================

def get_all_users(company_id=None):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            if company_id is not None:

                cursor.execute("""
                    SELECT
                        u.id,
                        u.name,
                        u.email,
                        u.role,

                        u.company_id,
                        c.company_name,

                        u.department_id,
                        d.department_name,

                        u.created_at

                    FROM users u

                    LEFT JOIN companies c
                        ON u.company_id = c.id

                    LEFT JOIN departments d
                        ON u.department_id = d.id

                    WHERE u.company_id = %s

                    ORDER BY u.id DESC
                """, (company_id,))

            else:

                cursor.execute("""
                    SELECT
                        u.id,
                        u.name,
                        u.email,
                        u.role,

                        u.company_id,
                        c.company_name,

                        u.department_id,
                        d.department_name,

                        u.created_at

                    FROM users u

                    LEFT JOIN companies c
                        ON u.company_id = c.id

                    LEFT JOIN departments d
                        ON u.department_id = d.id

                    ORDER BY u.id DESC
                """)

            return cursor.fetchall()


# ============================================================
# GET USER COUNT
# ============================================================

def get_user_count(company_id=None):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            if company_id is not None:

                cursor.execute("""
                    SELECT COUNT(*)
                    FROM users
                    WHERE company_id = %s
                """, (company_id,))

            else:

                cursor.execute("""
                    SELECT COUNT(*)
                    FROM users
                """)

            return cursor.fetchone()[0] or 0
# ============================================================
# GET USER PROGRESS
# ============================================================

def get_user_progress(user_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT

                    COUNT(DISTINCT l.id),
                    COUNT(DISTINCT lp.lesson_id)

                FROM enrollments e

                JOIN lessons l
                    ON l.course_id = e.course_id

                LEFT JOIN lesson_progress lp
                    ON lp.lesson_id = l.id
                   AND lp.user_id = e.user_id
                   AND lp.completed = 1

                WHERE e.user_id = %s
            """, (
                user_id,
            ))

            row = cursor.fetchone()

    total = row[0] or 0
    completed = row[1] or 0

    if total == 0:
        return 0

    return int(
        (completed / total) * 100
    )


# ============================================================
# DELETE USER
# ============================================================

def delete_user(user_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                DELETE FROM users
                WHERE id = %s
            """, (
                user_id,
            ))

            return cursor.rowcount > 0