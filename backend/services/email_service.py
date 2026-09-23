import os
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

import requests

from config import settings


def _email_configured() -> bool:
    return bool(
        settings.SMTP_HOST
        and settings.SMTP_USERNAME
        and settings.SMTP_PASSWORD
    )


def _sender() -> str:
    return settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME


def _sender_header() -> str:
    return formataddr(
        (
            settings.SMTP_FROM_NAME
            or "LMS",
            _sender(),
        )
    )


def _send_message(
    recipient: str,
    subject: str,
    text_body: str,
    html_body: str,
    attachment_bytes: bytes | None = None,
    attachment_filename: str | None = None,
):
    if not recipient:
        return False

    if not _email_configured():
        print("Email notification skipped: SMTP is not configured.")
        return False

    message = EmailMessage()
    message["From"] = _sender_header()
    message["To"] = recipient
    message["Subject"] = subject

    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    if attachment_bytes and attachment_filename:
        message.add_attachment(
            attachment_bytes,
            maintype="application",
            subtype="pdf",
            filename=attachment_filename,
        )

    try:
        if int(settings.SMTP_PORT) == 465:
            with smtplib.SMTP_SSL(
                settings.SMTP_HOST,
                int(settings.SMTP_PORT),
                timeout=20,
            ) as smtp:
                smtp.login(
                    settings.SMTP_USERNAME,
                    settings.SMTP_PASSWORD,
                )
                smtp.send_message(message)
        else:
            with smtplib.SMTP(
                settings.SMTP_HOST,
                int(settings.SMTP_PORT),
                timeout=20,
            ) as smtp:
                if settings.SMTP_USE_TLS:
                    smtp.starttls()
                smtp.login(
                    settings.SMTP_USERNAME,
                    settings.SMTP_PASSWORD,
                )
                smtp.send_message(message)

        print(
            f"Email notification sent to {recipient}: {subject}"
        )
        return True

    except Exception as exc:
        print(
            f"Email notification failed for {recipient}: {exc}"
        )
        return False


def send_course_assignment_email(
    recipient: str,
    user_name: str,
    course_title: str,
    course_url: str,
):
    safe_name = user_name or "Learner"
    safe_title = course_title or "your new course"

    subject = f"New course assigned: {safe_title}"

    text_body = f"""Hello {safe_name},

You have been assigned a new course:

{safe_title}

Open the course:
{course_url}

Regards,
LMS
"""

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #0f172a;">
        <h2>New Course Assigned</h2>
        <p>Hello {safe_name},</p>
        <p>You have been assigned a new course:</p>
        <p><strong>{safe_title}</strong></p>
        <p>
          <a
            href="{course_url}"
            style="display:inline-block;padding:10px 18px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;"
          >
            Open Course
          </a>
        </p>
        <p>Regards,<br>LMS</p>
      </body>
    </html>
    """

    return _send_message(
        recipient=recipient,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
    )


def send_certificate_email(
    recipient: str,
    user_name: str,
    course_title: str,
    certificate_url: str,
    certificate_number: str,
):
    if not certificate_url:
        print(
            "Certificate email skipped: certificate URL is missing."
        )
        return False

    safe_name = user_name or "Learner"
    safe_title = course_title or "Course Completion"
    safe_number = certificate_number or "Certificate"

    try:
        response = requests.get(
            certificate_url,
            timeout=30,
        )
        response.raise_for_status()
        pdf_bytes = response.content

    except Exception as exc:
        print(
            f"Certificate email attachment download failed: {exc}"
        )
        return False

    subject = f"Certificate of completion: {safe_title}"

    text_body = f"""Hello {safe_name},

Congratulations! You have successfully completed:

{safe_title}

Your certificate ({safe_number}) is attached to this email.

Regards,
LMS
"""

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #0f172a;">
        <h2>Certificate of Completion</h2>
        <p>Hello {safe_name},</p>
        <p>
          Congratulations! You have successfully completed:
        </p>
        <p><strong>{safe_title}</strong></p>
        <p>
          Your certificate
          <strong>{safe_number}</strong>
          is attached to this email.
        </p>
        <p>Regards,<br>LMS</p>
      </body>
    </html>
    """

    return _send_message(
        recipient=recipient,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        attachment_bytes=pdf_bytes,
        attachment_filename=f"{safe_number}.pdf",
    )
