from datetime import datetime
from html import escape
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from services.dashboard_db import get_dashboard_metrics
from services.postgres_db import get_db_connection


def build_report_pdf(
    scope_label,
    metrics_role,
    company_id=None,
    department_id=None,
):
    """Build a PDF report using only the company/department scope authorized by the API."""
    metrics = get_dashboard_metrics(
        role=metrics_role,
        company_id=company_id,
        department_id=department_id,
    )

    where = ["u.role = 'employee'"]
    params = []

    if company_id is not None:
        where.append("u.company_id = %s")
        params.append(company_id)

    if department_id is not None:
        where.append("u.department_id = %s")
        params.append(department_id)

    where_sql = " AND ".join(where)

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT
                    COALESCE(co.company_name, 'Unassigned') AS company_name,
                    COALESCE(d.department_name, 'Unassigned') AS department_name,
                    COALESCE(u.name, '') AS employee_name,
                    COALESCE(u.email, '') AS email,
                    COALESCE(u.designation, '') AS designation,
                    COALESCE(u.employment_status, '') AS employment_status,
                    ROUND(COALESCE(lt.learning_seconds, 0)::numeric / 3600, 1) AS learning_hours,
                    u.last_active_at
                FROM users u
                LEFT JOIN companies co ON co.id = u.company_id
                LEFT JOIN departments d ON d.id = u.department_id
                LEFT JOIN (
                    SELECT user_id, SUM(seconds) AS learning_seconds
                    FROM learning_time
                    GROUP BY user_id
                ) lt ON lt.user_id = u.id
                WHERE {where_sql}
                ORDER BY co.company_name, d.department_name, u.name
                """,
                params,
            )
            employees = cursor.fetchall()

            department_rows = []
            if department_id is None:
                dept_where = []
                dept_params = []
                if company_id is not None:
                    dept_where.append("d.company_id = %s")
                    dept_params.append(company_id)
                dept_filter = (
                    "WHERE " + " AND ".join(dept_where)
                    if dept_where else ""
                )
                cursor.execute(
                    f"""
                    SELECT
                        COALESCE(co.company_name, 'Unassigned'),
                        d.department_name,
                        COUNT(u.id) FILTER (WHERE u.role = 'employee') AS employees
                    FROM departments d
                    LEFT JOIN companies co ON co.id = d.company_id
                    LEFT JOIN users u ON u.department_id = d.id
                    {dept_filter}
                    GROUP BY co.company_name, d.id, d.department_name
                    ORDER BY co.company_name, d.department_name
                    """,
                    dept_params,
                )
                department_rows = cursor.fetchall()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=12 * mm,
        leftMargin=12 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title=f"LMS Report - {scope_label}",
        author="LMS",
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="ReportTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0F172A"),
        fontSize=19,
        leading=23,
        spaceAfter=5,
    ))
    styles.add(ParagraphStyle(
        name="SmallCell",
        parent=styles["BodyText"],
        fontSize=7,
        leading=8,
        wordWrap="CJK",
    ))

    story = [
        Paragraph("Learning Management System Report", styles["ReportTitle"]),
        Paragraph(f"<b>Scope:</b> {escape(scope_label)}", styles["Normal"]),
        Paragraph(
            f"<b>Generated:</b> {datetime.now().strftime('%d %B %Y, %I:%M %p')}",
            styles["Normal"],
        ),
        Spacer(1, 7 * mm),
        Paragraph("Summary", styles["Heading2"]),
    ]

    summary_items = [
        ("Users" if metrics_role == "super_admin" and company_id is None else "Employees", metrics.get("users", 0)),
        ("Active Users (30 days)", metrics.get("active_users", 0)),
        ("Courses", metrics.get("courses", 0)),
        ("Lessons", metrics.get("lessons", 0)),
        ("Learning Hours", metrics.get("learning_hours", 0)),
        ("Completion Rate", f"{metrics.get('completion_rate', 0)}%"),
        ("Certificates Issued", metrics.get("certificates_issued", 0)),
        ("AI Conversations", metrics.get("ai_conversations", 0)),
        ("AI Messages", metrics.get("ai_messages", 0)),
    ]
    if metrics_role == "super_admin" and company_id is None:
        summary_items.insert(0, ("Companies", metrics.get("companies", 0)))

    summary_data = [
        [Paragraph(f"<b>{label}</b>", styles["SmallCell"]),
         Paragraph(str(value), styles["SmallCell"])]
        for label, value in summary_items
    ]
    summary_table = Table(summary_data, colWidths=[55 * mm, 25 * mm], hAlign="LEFT")
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.extend([summary_table, Spacer(1, 7 * mm)])

    if department_rows:
        story.append(Paragraph("Department Overview", styles["Heading2"]))
        dept_data = [["Company", "Department", "Employees"]]
        dept_data.extend([[str(a or ""), str(b or ""), str(c or 0)] for a, b, c in department_rows])
        dept_table = Table(
            dept_data,
            repeatRows=1,
            colWidths=[75 * mm, 95 * mm, 30 * mm],
            hAlign="LEFT",
        )
        dept_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.extend([dept_table, Spacer(1, 7 * mm)])

    story.append(Paragraph("Employee Details", styles["Heading2"]))
    employee_headers = ["Company", "Department", "Employee", "Email", "Designation", "Status", "Learning Hours", "Last Active"]
    employee_data = [[Paragraph(f"<b>{h}</b>", styles["SmallCell"]) for h in employee_headers]]

    for row in employees:
        company, department, name, email, designation, status, hours, last_active = row
        active_text = last_active.strftime("%d %b %Y") if last_active else "Never"
        values = [
            company or "",
            department or "",
            name or "",
            email or "",
            designation or "",
            status or "—",
            str(hours or 0),
            active_text,
        ]
        employee_data.append([
            Paragraph(str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), styles["SmallCell"])
            for value in values
        ])

    if len(employee_data) == 1:
        employee_data.append([Paragraph("No employees found in this scope.", styles["SmallCell"])] + [""] * 7)

    employee_table = Table(
        employee_data,
        repeatRows=1,
        colWidths=[34 * mm, 34 * mm, 34 * mm, 49 * mm, 34 * mm, 25 * mm, 24 * mm, 26 * mm],
        hAlign="LEFT",
    )
    employee_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(employee_table)

    def add_page_number(canvas, document):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#64748B"))
        canvas.drawRightString(
            landscape(A4)[0] - 12 * mm,
            7 * mm,
            f"Page {document.page}",
        )
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    buffer.seek(0)
    return buffer.getvalue()
