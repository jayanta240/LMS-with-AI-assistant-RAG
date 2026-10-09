from datetime import datetime

from services.postgres_db import get_db_connection


def init_notification_db():
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    company_id INTEGER,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    notification_type TEXT NOT NULL DEFAULT 'system',
                    link TEXT,
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP NOT NULL
                )
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_notifications_user
                ON notifications(user_id)
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_notifications_unread
                ON notifications(user_id, is_read, created_at DESC)
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS company_notification_settings (
                    company_id INTEGER PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
                    course_assignment_email BOOLEAN NOT NULL DEFAULT TRUE,
                    certificate_email BOOLEAN NOT NULL DEFAULT TRUE,
                    updated_at TIMESTAMP NOT NULL
                )
            """)


def get_notification_settings(company_id: int):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    course_assignment_email,
                    certificate_email
                FROM company_notification_settings
                WHERE company_id = %s
            """, (company_id,))

            row = cursor.fetchone()

            if not row:
                cursor.execute("""
                    INSERT INTO company_notification_settings
                    (
                        company_id,
                        course_assignment_email,
                        certificate_email,
                        updated_at
                    )
                    VALUES (%s, TRUE, TRUE, %s)
                    ON CONFLICT (company_id) DO NOTHING
                """, (
                    company_id,
                    datetime.now(),
                ))

                cursor.execute("""
                    SELECT
                        course_assignment_email,
                        certificate_email
                    FROM company_notification_settings
                    WHERE company_id = %s
                """, (company_id,))

                row = cursor.fetchone()

    if not row:
        return {
            "course_assignment_email": True,
            "certificate_email": True,
        }

    return {
        "course_assignment_email": bool(row[0]),
        "certificate_email": bool(row[1]),
    }


def update_notification_settings(
    company_id: int,
    course_assignment_email: bool,
    certificate_email: bool,
):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO company_notification_settings
                (
                    company_id,
                    course_assignment_email,
                    certificate_email,
                    updated_at
                )
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (company_id)
                DO UPDATE SET
                    course_assignment_email = EXCLUDED.course_assignment_email,
                    certificate_email = EXCLUDED.certificate_email,
                    updated_at = EXCLUDED.updated_at
            """, (
                company_id,
                course_assignment_email,
                certificate_email,
                datetime.now(),
            ))

    return get_notification_settings(company_id)


# ============================================================
# IN-APP NOTIFICATIONS
# ============================================================

def create_notification(
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "system",
    company_id: int | None = None,
    link: str | None = None,
):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO notifications
                (
                    user_id,
                    company_id,
                    title,
                    message,
                    notification_type,
                    link,
                    is_read,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, FALSE, %s)
                RETURNING id
            """, (
                user_id,
                company_id,
                title,
                message,
                notification_type,
                link,
                datetime.now(),
            ))
            return cursor.fetchone()[0]


def notify_company_admins(
    company_id: int,
    title: str,
    message: str,
    notification_type: str = "system",
    link: str | None = None,
    exclude_user_id: int | None = None,
):
    """
    Insert company-admin notifications in one database operation.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            if exclude_user_id is None:
                cursor.execute("""
                    INSERT INTO notifications
                    (
                        user_id,
                        company_id,
                        title,
                        message,
                        notification_type,
                        link,
                        is_read,
                        created_at
                    )
                    SELECT
                        id,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        FALSE,
                        %s
                    FROM users
                    WHERE role = 'company_admin'
                      AND company_id = %s
                """, (
                    company_id,
                    title,
                    message,
                    notification_type,
                    link,
                    datetime.now(),
                    company_id,
                ))
            else:
                cursor.execute("""
                    INSERT INTO notifications
                    (
                        user_id,
                        company_id,
                        title,
                        message,
                        notification_type,
                        link,
                        is_read,
                        created_at
                    )
                    SELECT
                        id,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        FALSE,
                        %s
                    FROM users
                    WHERE role = 'company_admin'
                      AND company_id = %s
                      AND id <> %s
                """, (
                    company_id,
                    title,
                    message,
                    notification_type,
                    link,
                    datetime.now(),
                    company_id,
                    exclude_user_id,
                ))


def notify_super_admins(
    title: str,
    message: str,
    notification_type: str = "system",
    link: str | None = None,
    exclude_user_id: int | None = None,
):
    """
    Insert super-admin notifications in one database operation.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            if exclude_user_id is None:
                cursor.execute("""
                    INSERT INTO notifications
                    (
                        user_id,
                        company_id,
                        title,
                        message,
                        notification_type,
                        link,
                        is_read,
                        created_at
                    )
                    SELECT
                        id,
                        NULL,
                        %s,
                        %s,
                        %s,
                        %s,
                        FALSE,
                        %s
                    FROM users
                    WHERE role = 'super_admin'
                """, (
                    title,
                    message,
                    notification_type,
                    link,
                    datetime.now(),
                ))
            else:
                cursor.execute("""
                    INSERT INTO notifications
                    (
                        user_id,
                        company_id,
                        title,
                        message,
                        notification_type,
                        link,
                        is_read,
                        created_at
                    )
                    SELECT
                        id,
                        NULL,
                        %s,
                        %s,
                        %s,
                        %s,
                        FALSE,
                        %s
                    FROM users
                    WHERE role = 'super_admin'
                      AND id <> %s
                """, (
                    title,
                    message,
                    notification_type,
                    link,
                    datetime.now(),
                    exclude_user_id,
                ))



def get_notifications(user_id: int, limit: int = 30):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    id,
                    title,
                    message,
                    notification_type,
                    link,
                    is_read,
                    created_at
                FROM notifications
                WHERE user_id = %s
                ORDER BY created_at DESC, id DESC
                LIMIT %s
            """, (user_id, limit))

            rows = cursor.fetchall()

            cursor.execute("""
                SELECT COUNT(*)
                FROM notifications
                WHERE user_id = %s
                  AND is_read = FALSE
            """, (user_id,))

            unread_count = cursor.fetchone()[0] or 0

    return {
        "notifications": [
            {
                "id": row[0],
                "title": row[1],
                "message": row[2],
                "type": row[3],
                "link": row[4],
                "is_read": bool(row[5]),
                "created_at": row[6],
            }
            for row in rows
        ],
        "unread_count": unread_count,
    }


def mark_notification_read(
    notification_id: int,
    user_id: int,
):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE notifications
                SET is_read = TRUE
                WHERE id = %s
                  AND user_id = %s
            """, (notification_id, user_id))
            return cursor.rowcount > 0


def mark_all_notifications_read(user_id: int):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE notifications
                SET is_read = TRUE
                WHERE user_id = %s
                  AND is_read = FALSE
            """, (user_id,))
            return cursor.rowcount
