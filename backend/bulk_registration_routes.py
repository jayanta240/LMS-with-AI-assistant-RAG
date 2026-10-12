import io
import re
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from openpyxl import Workbook, load_workbook

from services.auth_dependency import get_current_user
from services.auth_service import hash_password
from services.department_db import get_departments
from services.postgres_db import get_db_connection
from services.user_db import create_user, get_user_by_email

router = APIRouter()

EMPLOYEE_HEADERS = [
    "employee_id", "first_name", "middle_name", "last_name", "gender",
    "date_of_birth", "email", "password", "mobile_number", "employment_type",
    "employment_status", "date_of_joining", "date_of_confirmation", "date_of_exit",
    "designation", "department_name", "department_head_email",
]
DEPARTMENT_HEAD_HEADERS = ["name", "email", "password", "department_name"]


def _normalise_header(value):
    return re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower()).strip("_")


def _cell_text(value):
    if value is None:
        return ""
    if isinstance(value, (datetime, date)):
        return value.strftime("%Y-%m-%d")
    return str(value).strip()


async def _read_rows(file: UploadFile, allowed_roles):
    filename = (file.filename or "").lower()
    if not filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Please upload an Excel .xlsx file.")
    if file.content_type not in {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
        "application/vnd.ms-excel",
        "",
    }:
        # Browsers and proxies vary the MIME type; extension and workbook parsing are authoritative.
        pass
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded Excel file is empty.")
    try:
        workbook = load_workbook(io.BytesIO(contents), read_only=True, data_only=True)
        sheet = workbook.active
        raw = sheet.iter_rows(values_only=True)
        headers_row = next(raw, None)
        if not headers_row:
            raise HTTPException(status_code=400, detail="The Excel sheet has no header row.")
        headers = [_normalise_header(v) for v in headers_row]
        if len(headers) != len(set(headers)):
            raise HTTPException(status_code=400, detail="The Excel file contains duplicate column headings.")
        missing = [h for h in allowed_roles if h not in headers]
        if missing:
            raise HTTPException(status_code=400, detail="Missing required columns: " + ", ".join(missing))
        rows = []
        for sheet_row, values in enumerate(raw, start=2):
            if not values or all(v is None or str(v).strip() == "" for v in values):
                continue
            row = {headers[i]: _cell_text(values[i]) if i < len(values) else "" for i in range(len(headers))}
            row["_row_number"] = sheet_row
            rows.append(row)
            if len(rows) > 500:
                raise HTTPException(status_code=400, detail="A maximum of 500 records can be uploaded per file.")
        workbook.close()
        if not rows:
            raise HTTPException(status_code=400, detail="The Excel file has headers but no data rows.")
        return rows
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read the Excel file. Please use the provided .xlsx template.")


@router.get("/api/bulk-registration/template")
def download_bulk_template(
    role: str = Query(..., pattern="^(employee|department_head)$"),
    current_user=Depends(get_current_user),
):
    actor_role = current_user.get("role")
    if role == "employee" and actor_role not in {"company_admin", "department_head"}:
        raise HTTPException(status_code=403, detail="You cannot download the employee template.")
    if role == "department_head" and actor_role != "company_admin":
        raise HTTPException(status_code=403, detail="Only Company Admin can download the Department Head template.")

    headers = EMPLOYEE_HEADERS if role == "employee" else DEPARTMENT_HEAD_HEADERS
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Employees" if role == "employee" else "Department Heads"
    sheet.append(headers)
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    for column_cells in sheet.columns:
        letter = column_cells[0].column_letter
        max_len = max(len(str(cell.value or "")) for cell in column_cells)
        sheet.column_dimensions[letter].width = min(max(max_len + 3, 16), 28)
    output = io.BytesIO()
    workbook.save(output)
    output.seek(0)
    filename = f"{role}_bulk_upload_template.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/api/bulk-registration/employees")
async def bulk_register_employees(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    role = current_user.get("role")
    if role not in {"company_admin", "department_head"}:
        raise HTTPException(status_code=403, detail="Only Company Admin or Department Head can bulk-register employees.")
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=403, detail="Your account is not associated with a company.")

    rows = await _read_rows(file, EMPLOYEE_HEADERS)
    department_rows = get_departments(company_id)
    departments_by_name = {str(r[2]).strip().casefold(): int(r[0]) for r in department_rows}
    heads_by_email = {}
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, email, department_id FROM users WHERE company_id = %s AND role = 'department_head'",
                (company_id,),
            )
            for head_id, head_email, head_department_id in cursor.fetchall():
                heads_by_email[str(head_email or "").strip().casefold()] = (int(head_id), head_department_id)

    created, failed = [], []
    seen_emails, seen_ids = set(), set()
    for row in rows:
        number = row["_row_number"]
        try:
            first = row.get("first_name", "").strip()
            middle = row.get("middle_name", "").strip()
            last = row.get("last_name", "").strip()
            name = " ".join(part for part in (first, middle, last) if part)
            email = row.get("email", "").strip().lower()
            employee_id = row.get("employee_id", "").strip()
            password = row.get("password", "")
            gender = row.get("gender", "").strip().title()
            dob = row.get("date_of_birth", "").strip()
            mobile = row.get("mobile_number", "").strip()
            employment_type = row.get("employment_type", "").strip().title()
            employment_status = row.get("employment_status", "").strip().title()
            doj = row.get("date_of_joining", "").strip()
            confirmation = row.get("date_of_confirmation", "").strip()
            exit_date = row.get("date_of_exit", "").strip()
            designation = row.get("designation", "").strip()
            if not all([first, last, email, employee_id, password, gender, dob, mobile, employment_type, employment_status, doj, designation]):
                raise ValueError("Missing one or more required fields.")
            if email in seen_emails:
                raise ValueError("Duplicate email in this Excel file.")
            if employee_id.casefold() in seen_ids:
                raise ValueError("Duplicate employee ID in this Excel file.")
            seen_emails.add(email)
            seen_ids.add(employee_id.casefold())
            if len(password) < 8:
                raise ValueError("Password must contain at least 8 characters.")
            dept_name = row.get("department_name", "").strip()
            if role == "department_head":
                department_id = current_user.get("department_id")
                head_id = current_user.get("user_id")
            else:
                department_id = departments_by_name.get(dept_name.casefold())
                if not department_id:
                    raise ValueError(f"Department '{dept_name}' was not found in your company.")
                head_email = row.get("department_head_email", "").strip().casefold()
                head_info = heads_by_email.get(head_email)
                if not head_info or int(head_info[1] or 0) != department_id:
                    raise ValueError("Department Head email does not belong to the selected department.")
                head_id = head_info[0]
            # Reuse the single-record registration path so all existing validations,
            # profile fields, hashing, notifications and department scope stay consistent.
            result = await _create_employee_from_bulk_row(
                current_user=current_user,
                employee_id=employee_id,
                employee_name=name,
                first_name=first,
                middle_name=middle,
                last_name=last,
                gender=gender,
                date_of_birth=dob,
                email=email,
                password=password,
                confirm_password=password,
                mobile_number=mobile,
                employment_type=employment_type,
                employment_status=employment_status,
                date_of_joining=doj,
                date_of_confirmation=confirmation,
                date_of_exit=exit_date,
                designation=designation,
                department_id=department_id,
                department_head_id=head_id,
            )
            created.append({"row": number, "name": name, "email": email, "employee_id": result.get("employee_id", employee_id)})
        except Exception as exc:
            detail = getattr(exc, "detail", None) or str(exc) or "Registration failed."
            failed.append({"row": number, "email": row.get("email", ""), "reason": str(detail)})
    return {"success": len(failed) == 0, "created_count": len(created), "failed_count": len(failed), "created": created, "failed": failed}


async def _create_employee_from_bulk_row(**values):
    # Import at call time to avoid coupling route initialization order.
    from main import create_employee_profile
    return await create_employee_profile(
        employee_id=values["employee_id"],
        employee_name=values["employee_name"],
        first_name=values["first_name"],
        middle_name=values["middle_name"],
        last_name=values["last_name"],
        gender=values["gender"],
        date_of_birth=values["date_of_birth"],
        email=values["email"],
        password=values["password"],
        confirm_password=values["confirm_password"],
        mobile_number=values["mobile_number"],
        employment_type=values["employment_type"],
        employment_status=values["employment_status"],
        date_of_joining=values["date_of_joining"],
        date_of_confirmation=values["date_of_confirmation"],
        date_of_exit=values["date_of_exit"],
        designation=values["designation"],
        department_id=values["department_id"],
        department_head_id=values["department_head_id"],
        profile_photo=None,
        current_user=values["current_user"],
    )


@router.post("/api/bulk-registration/department-heads")
async def bulk_register_department_heads(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    if current_user.get("role") != "company_admin":
        raise HTTPException(status_code=403, detail="Only Company Admin can bulk-register Department Heads.")
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=403, detail="Your account is not associated with a company.")
    rows = await _read_rows(file, DEPARTMENT_HEAD_HEADERS)
    department_rows = get_departments(company_id)
    departments_by_name = {str(r[2]).strip().casefold(): int(r[0]) for r in department_rows}
    created, failed = [], []
    seen_emails = set()
    for row in rows:
        number = row["_row_number"]
        name = row.get("name", "").strip()
        email = row.get("email", "").strip().lower()
        password = row.get("password", "")
        dept_name = row.get("department_name", "").strip()
        try:
            if not all([name, email, password, dept_name]):
                raise ValueError("Name, email, password, and department_name are required.")
            if email in seen_emails:
                raise ValueError("Duplicate email in this Excel file.")
            seen_emails.add(email)
            if len(password) < 8:
                raise ValueError("Password must contain at least 8 characters.")
            department_id = departments_by_name.get(dept_name.casefold())
            if not department_id:
                raise ValueError(f"Department '{dept_name}' was not found in your company.")
            if get_user_by_email(email):
                raise ValueError("Email already exists.")
            user_id = create_user(
                name=name,
                email=email,
                password_hash=hash_password(password),
                role="department_head",
                company_id=company_id,
                department_id=department_id,
            )
            created.append({"row": number, "name": name, "email": email, "user_id": user_id})
        except Exception as exc:
            detail = getattr(exc, "detail", None) or str(exc) or "Registration failed."
            failed.append({"row": number, "email": email, "reason": str(detail)})
    return {"success": len(failed) == 0, "created_count": len(created), "failed_count": len(failed), "created": created, "failed": failed}
