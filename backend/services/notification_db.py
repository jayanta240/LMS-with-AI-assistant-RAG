from datetime import datetime

from services.postgres_db import get_db_connection


def init_notification_db():
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
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
