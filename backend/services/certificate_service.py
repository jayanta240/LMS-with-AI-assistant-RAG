import re
import uuid
from io import BytesIO
from typing import Any, Dict, Optional

import cloudinary
import cloudinary.uploader
import requests

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

from config import settings


# ============================================================
# CLOUDINARY CONFIGURATION
# ============================================================

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


# ============================================================
# SAFE HELPERS
# ============================================================

def _safe_hex(value: Optional[str], fallback: str) -> str:
    """
    Accept only normal #RGB / #RRGGBB colors.
    """
    if not value:
        return fallback

    value = value.strip()

    if re.fullmatch(
        r"#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})",
        value,
    ):
        return value

    return fallback


def _truncate(text: str, max_length: int) -> str:
    text = str(text or "").strip()

    if len(text) <= max_length:
        return text

    return text[: max_length - 3] + "..."


def _download_logo(logo_url: str) -> Optional[BytesIO]:
    """
    Download the company logo into memory.

    Returns None when no usable logo is available.
    """
    if not logo_url:
        return None

    try:
        response = requests.get(
            logo_url,
            timeout=10,
        )

        response.raise_for_status()

        if not response.content:
            return None

        stream = BytesIO(response.content)
        stream.seek(0)

        return stream

    except Exception as exc:
        print(
            "Certificate logo download failed:",
            exc,
        )
        return None


# ============================================================
# CERTIFICATE PDF GENERATOR
# ============================================================

def generate_certificate_pdf(
    certificate: Dict[str, Any]
) -> str:
    """
    Generate a branded landscape A4 certificate,
    upload the PDF to Cloudinary, and return the
    secure Cloudinary URL.

    Expected certificate fields:
        id
        certificate_number
        certificate_uuid
        user_name
        course_title
        company_name
        logo_url
        primary_color
        secondary_color
        accent_color
        issued_at

    Returns:
        Secure Cloudinary URL for the generated PDF.
    """

    certificate_id = (
        certificate.get("id")
        or uuid.uuid4().hex
    )

    certificate_number = (
        certificate.get("certificate_number")
        or f"CERT-{uuid.uuid4().hex[:8].upper()}"
    )

    user_name = (
        certificate.get("user_name")
        or "Learner"
    )

    course_title = (
        certificate.get("course_title")
        or "Course Completion"
    )

    company_name = (
        certificate.get("company_name")
        or "Learning Platform"
    )

    issued_at = (
        certificate.get("issued_at")
        or ""
    )

    logo_url = (
        certificate.get("logo_url")
        or ""
    )

    primary = HexColor(
        _safe_hex(
            certificate.get("primary_color"),
            "#FBBF24",
        )
    )

    secondary = HexColor(
        _safe_hex(
            certificate.get("secondary_color"),
            "#0F172A",
        )
    )

    accent = HexColor(
        _safe_hex(
            certificate.get("accent_color"),
            "#F59E0B",
        )
    )

    # ========================================================
    # CREATE PDF IN MEMORY
    # ========================================================

    pdf_buffer = BytesIO()

    page_width, page_height = landscape(A4)

    pdf = canvas.Canvas(
        pdf_buffer,
        pagesize=(page_width, page_height),
    )

    # ========================================================
    # BACKGROUND
    # ========================================================

    pdf.setFillColor(white)

    pdf.rect(
        0,
        0,
        page_width,
        page_height,
        stroke=0,
        fill=1,
    )

    # ========================================================
    # OUTER BORDER
    # ========================================================

    margin = 24

    pdf.setStrokeColor(primary)
    pdf.setLineWidth(4)

    pdf.rect(
        margin,
        margin,
        page_width - (margin * 2),
        page_height - (margin * 2),
        stroke=1,
        fill=0,
    )

    # ========================================================
    # INNER BORDER
    # ========================================================

    inner_margin = 34

    pdf.setStrokeColor(accent)
    pdf.setLineWidth(1.2)

    pdf.rect(
        inner_margin,
        inner_margin,
        page_width - (inner_margin * 2),
        page_height - (inner_margin * 2),
        stroke=1,
        fill=0,
    )

    # ========================================================
    # TOP BRAND STRIP
    # ========================================================

    strip_height = 52

    pdf.setFillColor(secondary)

    pdf.rect(
        0,
        page_height - strip_height,
        page_width,
        strip_height,
        stroke=0,
        fill=1,
    )

    # ========================================================
    # LOGO
    # ========================================================

    logo = _download_logo(logo_url)

    if logo:
        try:
            image = ImageReader(logo)

            logo_width = 82
            logo_height = 42

            pdf.drawImage(
                image,
                46,
                page_height - 47,
                width=logo_width,
                height=logo_height,
                preserveAspectRatio=True,
                anchor="c",
                mask="auto",
            )

        except Exception as exc:
            print(
                "Certificate logo rendering failed:",
                exc,
            )

    # ========================================================
    # COMPANY NAME
    # ========================================================

    pdf.setFillColor(white)

    pdf.setFont(
        "Helvetica-Bold",
        16,
    )

    pdf.drawRightString(
        page_width - 46,
        page_height - 31,
        _truncate(company_name, 55),
    )

    # ========================================================
    # TITLE
    # ========================================================

    pdf.setFillColor(secondary)

    pdf.setFont(
        "Helvetica-Bold",
        30,
    )

    pdf.drawCentredString(
        page_width / 2,
        page_height - 108,
        "CERTIFICATE",
    )

    pdf.setFillColor(accent)

    pdf.setFont(
        "Helvetica-Bold",
        14,
    )

    pdf.drawCentredString(
        page_width / 2,
        page_height - 130,
        "OF COMPLETION",
    )

    # ========================================================
    # INTRODUCTION
    # ========================================================

    pdf.setFillColor(
        HexColor("#475569")
    )

    pdf.setFont(
        "Helvetica",
        12,
    )

    pdf.drawCentredString(
        page_width / 2,
        page_height - 168,
        "This certificate is proudly presented to",
    )

    # ========================================================
    # LEARNER NAME
    # ========================================================

    name_style = ParagraphStyle(
        "CertificateLearner",
        fontName="Helvetica-Bold",
        fontSize=25,
        leading=30,
        alignment=TA_CENTER,
        textColor=secondary,
    )

    name_paragraph = Paragraph(
        _truncate(user_name, 60),
        name_style,
    )

    name_w = page_width - 180
    name_h = 42

    name_paragraph.wrap(
        name_w,
        name_h,
    )

    name_paragraph.drawOn(
        pdf,
        90,
        page_height - 220,
    )

    # ========================================================
    # DIVIDER
    # ========================================================

    pdf.setStrokeColor(primary)
    pdf.setLineWidth(1.5)

    pdf.line(
        page_width / 2 - 170,
        page_height - 232,
        page_width / 2 + 170,
        page_height - 232,
    )

    # ========================================================
    # COURSE TEXT
    # ========================================================

    pdf.setFillColor(
        HexColor("#64748B")
    )

    pdf.setFont(
        "Helvetica",
        11,
    )

    pdf.drawCentredString(
        page_width / 2,
        page_height - 258,
        "for successfully completing",
    )

    # ========================================================
    # COURSE TITLE
    # ========================================================

    course_style = ParagraphStyle(
        "CertificateCourse",
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=23,
        alignment=TA_CENTER,
        textColor=secondary,
    )

    course_paragraph = Paragraph(
        _truncate(course_title, 75),
        course_style,
    )

    course_w = page_width - 190
    course_h = 55

    course_paragraph.wrap(
        course_w,
        course_h,
    )

    course_paragraph.drawOn(
        pdf,
        95,
        page_height - 321,
    )

    # ========================================================
    # COMPLETION STATEMENT
    # ========================================================

    pdf.setFillColor(
        HexColor("#64748B")
    )

    pdf.setFont(
        "Helvetica",
        10.5,
    )

    pdf.drawCentredString(
        page_width / 2,
        page_height - 345,
        "demonstrating successful completion of all required learning lessons.",
    )

    # ========================================================
    # FOOTER INFORMATION
    # ========================================================

    footer_y = 62

    pdf.setStrokeColor(
        HexColor("#CBD5E1")
    )

    pdf.setLineWidth(0.8)

    pdf.line(
        54,
        footer_y + 18,
        page_width - 54,
        footer_y + 18,
    )

    # Issue date

    pdf.setFillColor(
        HexColor("#64748B")
    )

    pdf.setFont(
        "Helvetica-Bold",
        8.5,
    )

    pdf.drawString(
        58,
        footer_y,
        "ISSUED",
    )

    pdf.setFont(
        "Helvetica",
        9,
    )

    pdf.drawString(
        58,
        footer_y - 13,
        str(issued_at),
    )

    # Certificate number

    pdf.setFont(
        "Helvetica-Bold",
        8.5,
    )

    pdf.drawCentredString(
        page_width / 2,
        footer_y,
        "CERTIFICATE ID",
    )

    pdf.setFont(
        "Helvetica",
        9,
    )

    pdf.drawCentredString(
        page_width / 2,
        footer_y - 13,
        str(certificate_number),
    )

    # Company signature area

    pdf.setFont(
        "Helvetica-Bold",
        8.5,
    )

    pdf.drawRightString(
        page_width - 58,
        footer_y,
        "ORGANIZATION",
    )

    pdf.setFont(
        "Helvetica",
        9,
    )

    pdf.drawRightString(
        page_width - 58,
        footer_y - 13,
        _truncate(company_name, 35),
    )

    # ========================================================
    # ACCENT MARKS
    # ========================================================

    pdf.setFillColor(primary)

    pdf.circle(
        page_width / 2,
        46,
        5,
        stroke=0,
        fill=1,
    )

    pdf.setFillColor(accent)

    pdf.circle(
        page_width / 2 - 16,
        46,
        3,
        stroke=0,
        fill=1,
    )

    pdf.circle(
        page_width / 2 + 16,
        46,
        3,
        stroke=0,
        fill=1,
    )

    # ========================================================
    # FINALIZE PDF
    # ========================================================

    pdf.showPage()
    pdf.save()

    pdf_buffer.seek(0)

    # ========================================================
    # CLOUDINARY UPLOAD
    # ========================================================

    safe_number = re.sub(
        r"[^A-Za-z0-9_-]+",
        "_",
        str(certificate_number),
    )

    public_id = (
        f"certificates/{safe_number}"
    )

    try:
        result = cloudinary.uploader.upload(
            pdf_buffer,
            resource_type="raw",
            public_id=public_id,
            format="pdf",
            overwrite=True,
        )

        pdf_url = result["secure_url"]

        print(
            f"✅ Certificate PDF uploaded to Cloudinary: {pdf_url}"
        )

        return pdf_url

    except Exception as exc:
        raise RuntimeError(
            f"Certificate PDF Cloudinary upload failed: {exc}"
        ) from exc