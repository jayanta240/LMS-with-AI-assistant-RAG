from datetime import datetime, timedelta
from services.postgres_db import get_db_connection


# ============================================================
# DASHBOARD / ACTIVITY DATABASE
# ============================================================

def init_dashboard_db():
    """
    Create the small set of tables/columns needed for live
    dashboard analytics.

    Existing data is preserved.
    """

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            # --------------------------------------------------------
            # User activity
            # --------------------------------------------------------
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_last_active_at
                ON users(last_active_at)
            """)

            # --------------------------------------------------------
            # Learning time
            # One row per user/course/lesson. The frontend periodically
            # reports active learning seconds and we accumulate them.
            # --------------------------------------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS learning_time (
                    user_id INTEGER NOT NULL,
                    company_id INTEGER,
                    course_id INTEGER NOT NULL,
                    lesson_id INTEGER NOT NULL,
                    seconds INTEGER NOT NULL DEFAULT 0,
                    updated_at TIMESTAMP NOT NULL,
                    PRIMARY KEY (user_id, course_id, lesson_id)
                )
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_learning_time_company
                ON learning_time(company_id)
            """)

            # --------------------------------------------------------
            # Persistent AI conversation sessions
            # --------------------------------------------------------
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ai_sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    company_id INTEGER,
                    started_at TIMESTAMP NOT NULL,
                    last_message_at TIMESTAMP NOT NULL,
                    message_count INTEGER NOT NULL DEFAULT 0
                )
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_ai_sessions_company
                ON ai_sessions(company_id)
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_ai_sessions_user
                ON ai_sessions(user_id)
            """)


# ============================================================
# USER ACTIVITY
# ============================================================

def touch_user_activity(user_id):
    if user_id is None:
        return

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE users
                SET last_active_at = NOW()
                WHERE id = %s
            """, (user_id,))


# ============================================================
# LEARNING TIME
# ============================================================

def record_learning_time(
    user_id,
    company_id,
    course_id,
    lesson_id,
    seconds
):
    try:
        seconds = int(seconds)
    except (TypeError, ValueError):
        return False

    # The client reports small heartbeats. Keep the server-side
    # value bounded so an invalid request cannot add huge amounts.
    if seconds < 1:
        return False

    seconds = min(seconds, 120)

    now = datetime.now()

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO learning_time (
                    user_id,
                    company_id,
                    course_id,
                    lesson_id,
                    seconds,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, course_id, lesson_id)
                DO UPDATE SET
                    seconds = learning_time.seconds + EXCLUDED.seconds,
                    updated_at = EXCLUDED.updated_at
            """, (
                user_id,
                company_id,
                course_id,
                lesson_id,
                seconds,
                now,
            ))

            cursor.execute("""
                UPDATE users
                SET last_active_at = %s
                WHERE id = %s
            """, (
                now,
                user_id,
            ))

    return True


# ============================================================
# AI SESSIONS
# ============================================================

def register_ai_session(
    session_id,
    user_id,
    company_id
):
    if not session_id or user_id is None:
        return False

    now = datetime.now()

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO ai_sessions (
                    session_id,
                    user_id,
                    company_id,
                    started_at,
                    last_message_at,
                    message_count
                )
                VALUES (%s, %s, %s, %s, %s, 0)
                ON CONFLICT (session_id)
                DO NOTHING
            """, (
                session_id,
                user_id,
                company_id,
                now,
                now,
            ))

            cursor.execute("""
                UPDATE users
                SET last_active_at = %s
                WHERE id = %s
            """, (
                now,
                user_id,
            ))

    return True


def record_ai_message(
    session_id,
    user_id
):
    if not session_id or user_id is None:
        return False

    now = datetime.now()

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE ai_sessions
                SET
                    last_message_at = %s,
                    message_count = message_count + 1
                WHERE session_id = %s
                  AND user_id = %s
            """, (
                now,
                session_id,
                user_id,
            ))

            cursor.execute("""
                UPDATE users
                SET last_active_at = %s
                WHERE id = %s
            """, (
                now,
                user_id,
            ))

            return cursor.rowcount > 0


# ============================================================
# DASHBOARD METRICS
# ============================================================

def get_dashboard_metrics(
    role,
    company_id=None,
    department_id=None,
    user_id=None
):
    """
    Return dashboard metrics scoped to the logged-in user's role.

    Uses one SQL statement to reduce sequential database round trips.
    Metric definitions and role-based filters match the previous version.
    """
    cutoff = datetime.now() - timedelta(days=30)

    params = {
        "cutoff": cutoff,
        "company_id": company_id,
        "department_id": department_id,
        "user_id": user_id,
        "role": role,
    }

    user_filters = []
    course_filters = []
    enrollment_filters = []
    certificate_filters = []
    learning_filters = []
    ai_filters = []

    # USER SCOPE
    if role == "company_admin" and company_id is not None:
        user_filters.extend([
            "u.company_id = %(company_id)s",
            "u.role = 'employee'",
        ])
    elif role == "department_head":
        if department_id is not None:
            user_filters.extend([
                "u.department_id = %(department_id)s",
                "u.role = 'employee'",
            ])
        elif company_id is not None:
            user_filters.extend([
                "u.company_id = %(company_id)s",
                "u.role = 'employee'",
            ])
    elif role == "employee" and user_id is not None:
        user_filters.append("u.id = %(user_id)s")

    # COURSE SCOPE
    if role in {"company_admin", "department_head"}:
        if company_id is not None:
            course_filters.append("c.company_id = %(company_id)s")
    elif role == "employee" and user_id is not None:
        course_filters.append("""
            EXISTS (
                SELECT 1
                FROM enrollments e2
                WHERE e2.course_id = c.id
                  AND e2.user_id = %(user_id)s
            )
        """)

    # ENROLLMENT SCOPE
    if role in {"company_admin", "department_head"}:
        if company_id is not None:
            enrollment_filters.append("c.company_id = %(company_id)s")

    if role == "department_head" and department_id is not None:
        enrollment_filters.append("u.department_id = %(department_id)s")

    if role == "employee" and user_id is not None:
        enrollment_filters.append("e.user_id = %(user_id)s")

    # CERTIFICATE SCOPE
    if role in {"company_admin", "department_head"}:
        if company_id is not None:
            certificate_filters.append("c.company_id = %(company_id)s")

    if role == "department_head" and department_id is not None:
        certificate_filters.append("""
            EXISTS (
                SELECT 1
                FROM users u
                WHERE u.id = c.user_id
                  AND u.department_id = %(department_id)s
            )
        """)

    if role == "employee" and user_id is not None:
        certificate_filters.append("c.user_id = %(user_id)s")

    # LEARNING TIME SCOPE
    if role in {"company_admin", "department_head"}:
        if company_id is not None:
            learning_filters.append("lt.company_id = %(company_id)s")

    if role == "department_head" and department_id is not None:
        learning_filters.append("""
            EXISTS (
                SELECT 1
                FROM users u
                WHERE u.id = lt.user_id
                  AND u.department_id = %(department_id)s
            )
        """)

    if role == "employee" and user_id is not None:
        learning_filters.append("lt.user_id = %(user_id)s")

    # AI SESSION SCOPE
    if role in {"company_admin", "department_head"}:
        if company_id is not None:
            ai_filters.append("a.company_id = %(company_id)s")

    if role == "department_head" and department_id is not None:
        ai_filters.append("""
            EXISTS (
                SELECT 1
                FROM users u
                WHERE u.id = a.user_id
                  AND u.department_id = %(department_id)s
            )
        """)

    if role == "employee" and user_id is not None:
        ai_filters.append("a.user_id = %(user_id)s")

    def where(filters):
        return "WHERE " + " AND ".join(filters) if filters else ""

    sql = f"""
        SELECT
            (SELECT COUNT(*)
             FROM users u
             {where(user_filters)}) AS total_users,

            (SELECT COUNT(*) FILTER (
                 WHERE u.last_active_at >= %(cutoff)s
             )
             FROM users u
             {where(user_filters)}) AS active_users,

            (SELECT COUNT(*)
             FROM courses c
             {where(course_filters)}) AS courses_count,

            (SELECT COUNT(*)
             FROM lessons l
             JOIN courses c ON c.id = l.course_id
             {where(course_filters)}) AS lessons_count,

            (SELECT COUNT(*)
             FROM enrollments e
             JOIN users u ON u.id = e.user_id
             JOIN courses c ON c.id = e.course_id
             {where(enrollment_filters)}) AS total_enrollments,

            (SELECT COUNT(*)
             FROM (
                 SELECT e.id
                 FROM enrollments e
                 JOIN users u ON u.id = e.user_id
                 JOIN courses c ON c.id = e.course_id
                 LEFT JOIN lessons l ON l.course_id = c.id
                 LEFT JOIN lesson_progress lp
                   ON lp.lesson_id = l.id
                  AND lp.user_id = e.user_id
                  AND lp.completed = 1
                 {where(enrollment_filters)}
                 GROUP BY e.id
                 HAVING COUNT(DISTINCT l.id) > 0
                    AND COUNT(DISTINCT lp.lesson_id)
                        >= COUNT(DISTINCT l.id)
             ) completed_enrollments) AS completed_enrollments,

            (SELECT COUNT(*)
             FROM certificates c
             {where(certificate_filters)}) AS certificates_count,

            (SELECT COALESCE(SUM(lt.seconds), 0)
             FROM learning_time lt
             {where(learning_filters)}) AS learning_seconds,

            (SELECT COUNT(*)
             FROM ai_sessions a
             {where(ai_filters)}) AS ai_conversations,

            (SELECT COALESCE(SUM(a.message_count), 0)
             FROM ai_sessions a
             {where(ai_filters)}) AS ai_messages,

            (SELECT COUNT(*)
             FROM companies) AS companies_count,

            (SELECT COUNT(*)
             FROM uploaded_files
             WHERE %(company_id)s IS NULL
                OR %(role)s = 'super_admin'
                OR company_id = %(company_id)s) AS files_count
    """

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            row = cursor.fetchone()

    companies_count = (
        int(row[10] or 0) if role == "super_admin" else 0
    )

    if role == "super_admin" or company_id is not None:
        files_count = int(row[11] or 0)
    else:
        files_count = 0

    total_enrollments = int(row[4] or 0)
    completed_enrollments = int(row[5] or 0)

    completion_rate = (
        round((completed_enrollments / total_enrollments) * 100, 1)
        if total_enrollments > 0
        else 0
    )

    return {
        "companies": companies_count,
        "users": int(row[0] or 0),
        "active_users": int(row[1] or 0),
        "courses": int(row[2] or 0),
        "lessons": int(row[3] or 0),
        "files": files_count,
        "learning_hours": round(int(row[7] or 0) / 3600, 1),
        "completion_rate": completion_rate,
        "certificates_issued": int(row[6] or 0),
        "ai_conversations": int(row[8] or 0),
        "ai_messages": int(row[9] or 0),
    }
