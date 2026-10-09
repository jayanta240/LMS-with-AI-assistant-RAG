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

    Definitions:
      - Active users: users with activity in the last 30 days.
      - Completion rate: fully completed course enrollments /
        total enrollments.
      - Learning hours: tracked active learning seconds / 3600.
      - Certificates: issued certificates in the user's scope.
      - AI conversations: persistent AI chat sessions in scope.
    """

    cutoff = datetime.now() - timedelta(days=30)

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            # --------------------------------------------------------
            # USER SCOPE
            # --------------------------------------------------------
            user_filters = []
            user_params = []

            if role == "company_admin" and company_id is not None:
                user_filters.append("u.company_id = %s")
                user_params.append(company_id)
                user_filters.append("u.role = 'employee'")

            elif role == "department_head":
                if department_id is not None:
                    user_filters.append("u.department_id = %s")
                    user_params.append(department_id)
                    user_filters.append("u.role = 'employee'")
                elif company_id is not None:
                    user_filters.append("u.company_id = %s")
                    user_params.append(company_id)
                    user_filters.append("u.role = 'employee'")

            elif role == "employee" and user_id is not None:
                user_filters.append("u.id = %s")
                user_params.append(user_id)

            user_where = (
                "WHERE " + " AND ".join(user_filters)
                if user_filters
                else ""
            )

            cursor.execute(
                f"""
                SELECT
                    COUNT(*) AS total_users,
                    COUNT(*) FILTER (
                        WHERE u.last_active_at >= %s
                    ) AS active_users
                FROM users u
                {user_where}
                """,
                [cutoff, *user_params],
            )

            user_row = cursor.fetchone()

            total_users = int(user_row[0] or 0)
            active_users = int(user_row[1] or 0)

            # --------------------------------------------------------
            # COURSE SCOPE
            # --------------------------------------------------------
            course_filters = []
            course_params = []

            if role in {"company_admin", "department_head"}:
                if company_id is not None:
                    course_filters.append("c.company_id = %s")
                    course_params.append(company_id)

            elif role == "employee" and user_id is not None:
                course_filters.append("""
                    EXISTS (
                        SELECT 1
                        FROM enrollments e2
                        WHERE e2.course_id = c.id
                          AND e2.user_id = %s
                    )
                """)
                course_params.append(user_id)

            course_where = (
                "WHERE " + " AND ".join(course_filters)
                if course_filters
                else ""
            )

            cursor.execute(
                f"""
                SELECT COUNT(*)
                FROM courses c
                {course_where}
                """,
                course_params,
            )
            courses_count = int(cursor.fetchone()[0] or 0)

            cursor.execute(
                f"""
                SELECT COUNT(*)
                FROM lessons l
                JOIN courses c
                  ON c.id = l.course_id
                {course_where}
                """,
                course_params,
            )
            lessons_count = int(cursor.fetchone()[0] or 0)

            # --------------------------------------------------------
            # ENROLLMENT / COMPLETION RATE
            # --------------------------------------------------------
            enrollment_filters = []
            enrollment_params = []

            if role in {"company_admin", "department_head"}:
                if company_id is not None:
                    enrollment_filters.append("c.company_id = %s")
                    enrollment_params.append(company_id)

            if role == "department_head" and department_id is not None:
                enrollment_filters.append("u.department_id = %s")
                enrollment_params.append(department_id)

            if role == "employee" and user_id is not None:
                enrollment_filters.append("e.user_id = %s")
                enrollment_params.append(user_id)

            enrollment_where = (
                "WHERE " + " AND ".join(enrollment_filters)
                if enrollment_filters
                else ""
            )

            cursor.execute(
                f"""
                SELECT COUNT(*)
                FROM enrollments e
                JOIN users u
                  ON u.id = e.user_id
                JOIN courses c
                  ON c.id = e.course_id
                {enrollment_where}
                """,
                enrollment_params,
            )
            total_enrollments = int(cursor.fetchone()[0] or 0)

            cursor.execute(
                f"""
                SELECT COUNT(*)
                FROM (
                    SELECT
                        e.id
                    FROM enrollments e
                    JOIN users u
                      ON u.id = e.user_id
                    JOIN courses c
                      ON c.id = e.course_id
                    LEFT JOIN lessons l
                      ON l.course_id = c.id
                    LEFT JOIN lesson_progress lp
                      ON lp.lesson_id = l.id
                     AND lp.user_id = e.user_id
                     AND lp.completed = 1
                    {enrollment_where}
                    GROUP BY e.id
                    HAVING COUNT(DISTINCT l.id) > 0
                       AND COUNT(DISTINCT lp.lesson_id)
                           >= COUNT(DISTINCT l.id)
                ) completed_enrollments
                """,
                enrollment_params,
            )
            completed_enrollments = int(cursor.fetchone()[0] or 0)

            completion_rate = (
                round(
                    (completed_enrollments / total_enrollments) * 100,
                    1,
                )
                if total_enrollments > 0
                else 0
            )

            # --------------------------------------------------------
            # CERTIFICATES
            # --------------------------------------------------------
            certificate_filters = []
            certificate_params = []

            if role in {"company_admin", "department_head"}:
                if company_id is not None:
                    certificate_filters.append(
                        "c.company_id = %s"
                    )
                    certificate_params.append(company_id)

            if role == "department_head" and department_id is not None:
                certificate_filters.append(
                    "EXISTS ("
                    "SELECT 1 FROM users u "
                    "WHERE u.id = c.user_id "
                    "AND u.department_id = %s)"
                )
                certificate_params.append(department_id)

            if role == "employee" and user_id is not None:
                certificate_filters.append("c.user_id = %s")
                certificate_params.append(user_id)

            certificate_where = (
                "WHERE " + " AND ".join(certificate_filters)
                if certificate_filters
                else ""
            )

            cursor.execute(
                f"""
                SELECT COUNT(*)
                FROM certificates c
                {certificate_where}
                """,
                certificate_params,
            )
            certificates_count = int(cursor.fetchone()[0] or 0)

            # --------------------------------------------------------
            # LEARNING HOURS
            # --------------------------------------------------------
            learning_filters = []
            learning_params = []

            if role in {"company_admin", "department_head"}:
                if company_id is not None:
                    learning_filters.append("lt.company_id = %s")
                    learning_params.append(company_id)

            if role == "department_head" and department_id is not None:
                learning_filters.append("""
                    EXISTS (
                        SELECT 1
                        FROM users u
                        WHERE u.id = lt.user_id
                          AND u.department_id = %s
                    )
                """)
                learning_params.append(department_id)

            if role == "employee" and user_id is not None:
                learning_filters.append("lt.user_id = %s")
                learning_params.append(user_id)

            learning_where = (
                "WHERE " + " AND ".join(learning_filters)
                if learning_filters
                else ""
            )

            cursor.execute(
                f"""
                SELECT COALESCE(SUM(lt.seconds), 0)
                FROM learning_time lt
                {learning_where}
                """,
                learning_params,
            )
            learning_seconds = int(cursor.fetchone()[0] or 0)

            learning_hours = round(
                learning_seconds / 3600,
                1,
            )

            # --------------------------------------------------------
            # AI CONVERSATIONS
            # --------------------------------------------------------
            ai_filters = []
            ai_params = []

            if role in {"company_admin", "department_head"}:
                if company_id is not None:
                    ai_filters.append("a.company_id = %s")
                    ai_params.append(company_id)

            if role == "department_head" and department_id is not None:
                ai_filters.append("""
                    EXISTS (
                        SELECT 1
                        FROM users u
                        WHERE u.id = a.user_id
                          AND u.department_id = %s
                    )
                """)
                ai_params.append(department_id)

            if role == "employee" and user_id is not None:
                ai_filters.append("a.user_id = %s")
                ai_params.append(user_id)

            ai_where = (
                "WHERE " + " AND ".join(ai_filters)
                if ai_filters
                else ""
            )

            cursor.execute(
                f"""
                SELECT
                    COUNT(*),
                    COALESCE(SUM(a.message_count), 0)
                FROM ai_sessions a
                {ai_where}
                """,
                ai_params,
            )

            ai_row = cursor.fetchone()
            ai_conversations = int(ai_row[0] or 0)
            ai_messages = int(ai_row[1] or 0)

    # Super Admin uses global platform values.
    if role == "super_admin":
        from services.company_db import get_company_count
        from services.file_db import get_file_count

        companies_count = get_company_count()
        files_count = get_file_count()
    else:
        companies_count = 0

        from services.file_db import get_file_count

        files_count = get_file_count(
            company_id=company_id
        ) if company_id is not None else 0

    return {
        "companies": companies_count,
        "users": total_users,
        "active_users": active_users,
        "courses": courses_count,
        "lessons": lessons_count,
        "files": files_count,
        "learning_hours": learning_hours,
        "completion_rate": completion_rate,
        "certificates_issued": certificates_count,
        "ai_conversations": ai_conversations,
        "ai_messages": ai_messages,
    }
