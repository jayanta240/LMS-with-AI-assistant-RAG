from datetime import date
import logging

from services.postgres_db import get_db_connection
from services.notification_db import create_notification, get_notification_settings
from services.email_service import send_certificate_expiry_reminder

logger = logging.getLogger(__name__)


def process_due_certificate_expiry_reminders():
    """Send one learner-only reminder at 7 days, 1 day, and expiry day."""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    c.id, c.user_id, c.company_id, c.user_name,
                    c.course_title, c.company_name, c.certificate_number,
                    c.expires_at, u.email,
                    CASE
                        WHEN c.expires_at::date = CURRENT_DATE + 7 THEN 7
                        WHEN c.expires_at::date = CURRENT_DATE + 1 THEN 1
                        WHEN c.expires_at::date = CURRENT_DATE THEN 0
                    END AS days_remaining
                FROM certificates c
                JOIN users u ON u.id = c.user_id
                WHERE c.status = 'issued'
                  AND c.expires_at IS NOT NULL
                  AND c.expires_at::date IN (
                      CURRENT_DATE + 7,
                      CURRENT_DATE + 1,
                      CURRENT_DATE
                  )
            """)
            due_certificates = cursor.fetchall()

    sent_or_queued = 0
    for row in due_certificates:
        (certificate_id, user_id, company_id, user_name, course_title,
         company_name, certificate_number, expires_at, email, days_remaining) = row

        # Unique constraint makes each reminder stage idempotent across runs.
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO certificate_expiry_reminders
                        (certificate_id, reminder_days)
                    VALUES (%s, %s)
                    ON CONFLICT (certificate_id, reminder_days) DO NOTHING
                    RETURNING id
                """, (certificate_id, days_remaining))
                inserted = cursor.fetchone()
                if inserted:
                    reminder_id = inserted[0]
                    should_create_notification = True
                    should_send_email = True
                else:
                    cursor.execute("""
                        SELECT id, notification_created, email_sent
                        FROM certificate_expiry_reminders
                        WHERE certificate_id = %s AND reminder_days = %s
                    """, (certificate_id, days_remaining))
                    reminder = cursor.fetchone()
                    reminder_id = reminder[0]
                    should_create_notification = not reminder[1]
                    should_send_email = not reminder[2]

        expiry_label = expires_at.strftime("%d %B %Y") if hasattr(expires_at, "strftime") else str(expires_at)
        if days_remaining == 7:
            title = "Certificate expires in 7 days"
            message = f"Your certificate for {course_title} expires in 7 days, on {expiry_label}."
        elif days_remaining == 1:
            title = "Certificate expires tomorrow"
            message = f"Your certificate for {course_title} expires tomorrow ({expiry_label})."
        else:
            title = "Certificate expires today"
            message = f"Your certificate for {course_title} expires today ({expiry_label})."

        if should_create_notification:
            create_notification(
                user_id=user_id,
                company_id=company_id,
                title=title,
                message=message,
                notification_type="certificate",
                link="/learning/dashboard",
            )
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        UPDATE certificate_expiry_reminders
                        SET notification_created = TRUE
                        WHERE id = %s
                    """, (reminder_id,))
            sent_or_queued += 1

        if should_send_email and email:
            try:
                email_enabled = get_notification_settings(company_id)["certificate_email"]
                if not email_enabled:
                    # Respect the company's existing certificate-email preference.
                    with get_db_connection() as conn:
                        with conn.cursor() as cursor:
                            cursor.execute("""
                                UPDATE certificate_expiry_reminders
                                SET email_sent = TRUE
                                WHERE id = %s
                            """, (reminder_id,))
                    continue

                delivered = send_certificate_expiry_reminder(
                    recipient=email,
                    user_name=user_name,
                    course_title=course_title,
                    certificate_number=certificate_number,
                    expires_at=expires_at,
                    days_remaining=days_remaining,
                    sender_name=company_name,
                )
                if delivered:
                    with get_db_connection() as conn:
                        with conn.cursor() as cursor:
                            cursor.execute("""
                                UPDATE certificate_expiry_reminders
                                SET email_sent = TRUE
                                WHERE id = %s
                            """, (reminder_id,))
            except Exception:
                logger.exception("Certificate expiry email failed for certificate id %s", certificate_id)

    return sent_or_queued
