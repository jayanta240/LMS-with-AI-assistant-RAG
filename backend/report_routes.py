import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from services.auth_dependency import get_current_user
from services.postgres_db import get_db_connection

router = APIRouter()


@router.get("/api/reports/download")
def download_report(
    company_id: int | None = Query(default=None),
    scope: str = Query(default="company"),
    department_id: int | None = Query(default=None),
    user_id: int | None = Query(default=None),
    course_id: int | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    current_user=Depends(get_current_user),
):
    """Download a role-scoped employee/course progress report as CSV."""
    role = str(current_user.get("role") or "").lower()
    user_company_id = current_user.get("company_id")
    user_department_id = current_user.get("department_id")

    conditions = ["u.role = 'employee'"]
    params = []
    report_scope = "All companies"

    if start_date:
        try:
            datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start date. Use YYYY-MM-DD.")
    if end_date:
        try:
            datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end date. Use YYYY-MM-DD.")
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date must be before or equal to end date.")

    if role == "super_admin":
        # Super admins can export all companies or select one company.
        if company_id is not None:
            conditions.append("u.company_id = %s")
            params.append(company_id)
            report_scope = "Selected company"
    elif role == "company_admin":
        if user_company_id is None:
            raise HTTPException(status_code=403, detail="Your account is not associated with a company.")
        conditions.append("u.company_id = %s")
        params.append(user_company_id)
        report_scope = "Company"
        if scope == "department":
            if department_id is None:
                raise HTTPException(status_code=400, detail="Select a department for a department report.")
            conditions.append("u.department_id = %s")
            params.append(department_id)
            report_scope = "Department"
        elif scope != "company":
            raise HTTPException(status_code=400, detail="Invalid report scope.")
    elif role == "department_head":
        if user_company_id is None or user_department_id is None:
            raise HTTPException(status_code=403, detail="Your account is not assigned to a department.")
        # Ignore any client-supplied scope/company/department; token identity is authoritative.
        conditions.extend(["u.company_id = %s", "u.department_id = %s"])
        params.extend([user_company_id, user_department_id])
        report_scope = "Assigned department"
    else:
        raise HTTPException(status_code=403, detail="You do not have permission to download reports.")

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            if role == "super_admin" and company_id is not None:
                cursor.execute("SELECT id FROM companies WHERE id = %s", (company_id,))
                if cursor.fetchone() is None:
                    raise HTTPException(status_code=404, detail="Company not found.")

            if role == "company_admin" and scope == "department":
                cursor.execute(
                    "SELECT id FROM departments WHERE id = %s AND company_id = %s",
                    (department_id, user_company_id),
                )
                if cursor.fetchone() is None:
                    raise HTTPException(status_code=404, detail="Department not found in your company.")

            if role == "super_admin" and department_id is not None:
                if company_id is not None:
                    cursor.execute(
                        "SELECT id FROM departments WHERE id = %s AND company_id = %s",
                        (department_id, company_id),
                    )
                else:
                    cursor.execute("SELECT id FROM departments WHERE id = %s", (department_id,))
                if cursor.fetchone() is None:
                    raise HTTPException(status_code=404, detail="Department not found.")

            if department_id is not None and role == "super_admin":
                conditions.append("u.department_id = %s")
                params.append(department_id)
            if user_id is not None:
                conditions.append("u.id = %s")
                params.append(user_id)
            if course_id is not None:
                conditions.append("c.id = %s")
                params.append(course_id)
            if start_date:
                conditions.append("e.assigned_at >= %s")
                params.append(start_date)
            if end_date:
                conditions.append("e.assigned_at < (%s::date + INTERVAL '1 day')")
                params.append(end_date)

            cursor.execute(
                f"""
                SELECT
                    COALESCE(co.company_name, ''),
                    COALESCE(d.department_name, ''),
                    COALESCE(u.name, ''),
                    COALESCE(u.email, ''),
                    COALESCE(u.employee_id, ''),
                    COALESCE(c.title, ''),
                    e.assigned_at,
                    COUNT(DISTINCT l.id) AS total_lessons,
                    COUNT(DISTINCT lp.lesson_id) AS completed_lessons,
                    COALESCE((
                        SELECT SUM(lt.seconds)
                        FROM learning_time lt
                        WHERE lt.user_id = u.id AND lt.course_id = c.id
                    ), 0) AS learning_seconds
                FROM users u
                LEFT JOIN companies co ON co.id = u.company_id
                LEFT JOIN departments d ON d.id = u.department_id
                INNER JOIN enrollments e ON e.user_id = u.id
                INNER JOIN courses c ON c.id = e.course_id
                LEFT JOIN lessons l ON l.course_id = c.id
                LEFT JOIN lesson_progress lp
                    ON lp.lesson_id = l.id
                   AND lp.user_id = u.id
                   AND lp.completed = 1
                WHERE {" AND ".join(conditions)}
                GROUP BY
                    co.company_name, d.department_name, u.id, u.name,
                    u.email, u.employee_id, c.id, c.title, e.assigned_at
                ORDER BY co.company_name, d.department_name, u.name, c.title
                """,
                tuple(params),
            )
            rows = cursor.fetchall()

    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow([
        "Company", "Department", "Employee", "Email", "Employee ID",
        "Course", "Assigned At", "Total Lessons", "Completed Lessons",
        "Completion %", "Learning Hours",
    ])

    for row in rows:
        total_lessons = int(row[7] or 0)
        completed_lessons = int(row[8] or 0)
        completion = round((completed_lessons / total_lessons) * 100, 1) if total_lessons else 0
        learning_hours = round((int(row[9] or 0) / 3600), 2)
        assigned_at_value = row[6]
        if isinstance(assigned_at_value, datetime):
            assigned_at = assigned_at_value.isoformat()
        elif assigned_at_value:
            # Some database drivers/configurations return timestamp columns as strings.
            assigned_at = str(assigned_at_value)
        else:
            assigned_at = ""
        writer.writerow([
            row[0], row[1], row[2], row[3], row[4], row[5],
            assigned_at, total_lessons, completed_lessons, completion, learning_hours,
        ])

    output.seek(0)
    filename = f"lms_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter(["\ufeff" + output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
