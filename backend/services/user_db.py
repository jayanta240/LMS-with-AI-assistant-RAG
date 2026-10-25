from datetime import datetime

from services.postgres_db import get_db_connection


# ============================================================
# SAFE, IDEMPOTENT USER-SCHEMA MIGRATION
# ============================================================

def init_user_db():
    """
    Ensure department-head assignments are supported in existing
    production databases. Existing records are preserved.

    Legacy employees are auto-assigned only when exactly one
    department head belongs to the same company and department.
    Ambiguous assignments are left unchanged for an administrator
    to resolve explicitly.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS department_head_id INTEGER
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_department_head_id
                ON users (department_head_id)
            """)

            cursor.execute("""
                UPDATE users AS employee
                SET department_head_id = (
                    SELECT MIN(head.id)
                    FROM users AS head
                    WHERE head.role = 'department_head'
                      AND head.company_id = employee.company_id
                      AND head.department_id = employee.department_id
                )
                WHERE employee.role = 'employee'
                  AND employee.department_head_id IS NULL
                  AND employee.company_id IS NOT NULL
                  AND employee.department_id IS NOT NULL
                  AND (
                    SELECT COUNT(*)
                    FROM users AS head
                    WHERE head.role = 'department_head'
                      AND head.company_id = employee.company_id
                      AND head.department_id = employee.department_id
                  ) = 1
            """)


# ============================================================
# CREATE USER
# ============================================================

def create_user(
    name,
    email,
    password_hash,
    role="employee",
    company_id=None,
    department_id=None,
    department_head_id=None,
    employee_id=None,
    first_name=None,
    middle_name=None,
    last_name=None,
    gender=None,
    date_of_birth=None,
    profile_photo_url=None,
    mobile_number=None,
    employment_type=None,
    employment_status=None,
    date_of_joining=None,
    date_of_confirmation=None,
    date_of_exit=None,
    designation=None,
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
                    created_at,
                    employee_id,
                    department_head_id,
                    first_name,
                    middle_name,
                    last_name,
                    gender,
                    date_of_birth,
                    profile_photo_url,
                    mobile_number,
                    employment_type,
                    employment_status,
                    date_of_joining,
                    date_of_confirmation,
                    date_of_exit,
                    designation
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
            """, (
                name,
                email,
                password_hash,
                role,
                company_id,
                department_id,
                datetime.now(),
                employee_id,
                department_head_id,
                first_name,
                middle_name,
                last_name,
                gender,
                date_of_birth,
                profile_photo_url,
                mobile_number,
                employment_type,
                employment_status,
                date_of_joining,
                date_of_confirmation,
                date_of_exit,
                designation,
            ))

            user_id = cursor.fetchone()[0]

            return user_id


def employee_id_exists(employee_id):
    if not employee_id:
        return False

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 1
                FROM users
                WHERE employee_id = %s
                LIMIT 1
            """, (employee_id,))

            return cursor.fetchone() is not None


def get_company_admin_profiles():
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    u.company_id,
                    c.company_name,
                    u.employee_id,
                    u.profile_photo_url,
                    u.created_at
                FROM users u
                LEFT JOIN companies c
                    ON c.id = u.company_id
                WHERE u.role = 'company_admin'
                ORDER BY u.id DESC
            """)

            return cursor.fetchall()


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

                        u.created_at,
                        u.department_head_id,
                        u.profile_photo_url

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

                        u.created_at,
                        u.department_head_id,
                        u.profile_photo_url

                    FROM users u

                    LEFT JOIN companies c
                        ON u.company_id = c.id

                    LEFT JOIN departments d
                        ON u.department_id = d.id

                    ORDER BY u.id DESC
                """)

            return cursor.fetchall()


# ============================================================
# OPTIMIZED EMPLOYEE LIST WITH PROGRESS
# ============================================================

def get_employees_with_progress(company_id=None, department_head_id=None):
    """
    Fetch employees and their learning progress in one query.

    The returned columns retain the /api/users row layout:
    id, name, email, role, company_id, company_name, department_id,
    department_name, created_at, department_head_id, profile_photo_url,
    progress.
    """
    filters = ["u.role = 'employee'"]
    params = []

    if company_id is not None:
        filters.append("u.company_id = %s")
        params.append(company_id)

    if department_head_id is not None:
        filters.append("u.department_head_id = %s")
        params.append(department_head_id)

    where_clause = " AND ".join(filters)

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(f"""
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    u.company_id,
                    c.company_name,
                    u.department_id,
                    d.department_name,
                    u.created_at,
                    u.department_head_id,
                    u.profile_photo_url,
                    CASE
                        WHEN COUNT(DISTINCT l.id) = 0 THEN 0
                        ELSE CAST(
                            COUNT(DISTINCT CASE
                                WHEN lp.completed = 1 THEN lp.lesson_id
                            END)::numeric
                            / COUNT(DISTINCT l.id) * 100
                            AS INTEGER
                        )
                    END AS progress
                FROM users u
                LEFT JOIN companies c
                    ON u.company_id = c.id
                LEFT JOIN departments d
                    ON u.department_id = d.id
                LEFT JOIN enrollments e
                    ON e.user_id = u.id
                LEFT JOIN lessons l
                    ON l.course_id = e.course_id
                LEFT JOIN lesson_progress lp
                    ON lp.lesson_id = l.id
                   AND lp.user_id = u.id
                   AND lp.completed = 1
                WHERE {where_clause}
                GROUP BY
                    u.id, u.name, u.email, u.role, u.company_id,
                    c.company_name, u.department_id, d.department_name,
                    u.created_at, u.department_head_id, u.profile_photo_url
                ORDER BY u.id DESC
            """, tuple(params))
            return cursor.fetchall()


# ============================================================
# DEPARTMENT HEADS BY COMPANY
# ============================================================

def get_department_heads_by_company(company_id, department_id=None):
    """
    Fetch only department heads for a company, optionally scoped to a
    department. Column order matches get_all_users().
    """
    query = """
        SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            u.company_id,
            c.company_name,
            u.department_id,
            d.department_name,
            u.created_at,
            u.department_head_id,
            u.profile_photo_url
        FROM users u
        LEFT JOIN companies c
            ON u.company_id = c.id
        LEFT JOIN departments d
            ON u.department_id = d.id
        WHERE u.company_id = %s
          AND u.role = 'department_head'
    """
    params = [company_id]

    if department_id is not None:
        query += " AND u.department_id = %s"
        params.append(department_id)

    query += " ORDER BY u.id DESC"

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, tuple(params))
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
# DELETE COMPANY ADMIN
# ============================================================

def delete_company_admin(user_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                DELETE FROM users
                WHERE id = %s
                  AND role = 'company_admin'
            """, (
                user_id,
            ))

            return cursor.rowcount > 0


# ============================================================
# DELETE DEPARTMENT HEAD
# ============================================================

def delete_department_head(user_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                DELETE FROM users
                WHERE id = %s
                  AND role = 'department_head'
            """, (
                user_id,
            ))

            return cursor.rowcount > 0


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