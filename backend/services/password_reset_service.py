import hashlib
import logging
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from config import settings
from services.postgres_db import get_db_connection
from services.auth_service import hash_password

logger = logging.getLogger("lms.password_reset")
OTP_TTL_MINUTES = 10
OTP_RESEND_SECONDS = 60
OTP_MAX_ATTEMPTS = 5


def init_password_reset_db():
    """Create the password reset table if it does not already exist."""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS password_reset_otps (
                    email TEXT PRIMARY KEY,
                    otp_hash TEXT NOT NULL,
                    expires_at TIMESTAMPTZ NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    last_sent_at TIMESTAMPTZ NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at
                ON password_reset_otps (expires_at)
            """)


def _send_otp_email(email: str, otp: str):
    host = (settings.SMTP_HOST or "").strip()
    username = (settings.SMTP_USERNAME or "").strip()
    password = settings.SMTP_PASSWORD or ""
    sender = (settings.SMTP_FROM_EMAIL or username).strip()
    if not host or not sender or not username or not password:
        raise RuntimeError("SMTP email settings are not configured.")

    message = EmailMessage()
    message["Subject"] = "Your LMS password reset OTP"
    message["From"] = f"{settings.SMTP_FROM_NAME} <{sender}>"
    message["To"] = email
    message.set_content(
        f"Your LMS password reset OTP is: {otp}\n\n"
        f"This code expires in {OTP_TTL_MINUTES} minutes and can be used only once. "
        "If you did not request a password reset, you can ignore this email.\n\n"
        "For your security, do not share this code with anyone."
    )

    with smtplib.SMTP(host, settings.SMTP_PORT, timeout=15) as server:
        if settings.SMTP_USE_TLS:
            server.starttls()
        server.login(username, password)
        server.send_message(message)


def request_password_reset(email: str):
    normalized_email = email.strip().lower()
    now = datetime.now(timezone.utc)

    # Use the same public response for known and unknown email addresses.
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = %s LIMIT 1", (normalized_email,))
            user = cursor.fetchone()
            if not user:
                return

            cursor.execute(
                "SELECT last_sent_at FROM password_reset_otps WHERE email = %s",
                (normalized_email,),
            )
            existing = cursor.fetchone()
            if existing and existing[0] and (now - existing[0]).total_seconds() < OTP_RESEND_SECONDS:
                return

            otp = f"{secrets.randbelow(1_000_000):06d}"
            otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()
            cursor.execute("""
                INSERT INTO password_reset_otps (email, otp_hash, expires_at, attempts, last_sent_at, created_at)
                VALUES (%s, %s, %s, 0, %s, %s)
                ON CONFLICT (email) DO UPDATE SET
                    otp_hash = EXCLUDED.otp_hash,
                    expires_at = EXCLUDED.expires_at,
                    attempts = 0,
                    last_sent_at = EXCLUDED.last_sent_at,
                    created_at = EXCLUDED.created_at
            """, (normalized_email, otp_hash, now + timedelta(minutes=OTP_TTL_MINUTES), now, now))

    # Do not keep the database transaction open while contacting SMTP.
    try:
        _send_otp_email(normalized_email, otp)
    except Exception:
        logger.exception("Password reset OTP email delivery failed.")
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM password_reset_otps WHERE email = %s", (normalized_email,))
        raise


def reset_password_with_otp(email: str, otp: str, new_password: str):
    normalized_email = email.strip().lower()
    now = datetime.now(timezone.utc)
    supplied_hash = hashlib.sha256(otp.strip().encode("utf-8")).hexdigest()

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT otp_hash, expires_at, attempts
                FROM password_reset_otps
                WHERE email = %s
                FOR UPDATE
            """, (normalized_email,))
            reset = cursor.fetchone()

            if not reset:
                return False

            otp_hash, expires_at, attempts = reset
            if attempts >= OTP_MAX_ATTEMPTS or expires_at <= now:
                cursor.execute("DELETE FROM password_reset_otps WHERE email = %s", (normalized_email,))
                return False

            if not secrets.compare_digest(otp_hash, supplied_hash):
                cursor.execute(
                    "UPDATE password_reset_otps SET attempts = attempts + 1 WHERE email = %s",
                    (normalized_email,),
                )
                return False

            cursor.execute(
                "UPDATE users SET password_hash = %s WHERE LOWER(email) = %s RETURNING id",
                (hash_password(new_password), normalized_email),
            )
            updated_user = cursor.fetchone()
            cursor.execute("DELETE FROM password_reset_otps WHERE email = %s", (normalized_email,))
            return updated_user is not None
