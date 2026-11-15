from fastapi import APIRouter, Depends, HTTPException, Query

from services.auth_dependency import get_current_user
from services.postgres_db import get_db_connection


router = APIRouter()


@router.get("/api/audit-logs")
def get_audit_logs(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    search: str = Query(default="", max_length=120),
    current_user=Depends(get_current_user),
):
    """Return a plain-language activity history within the caller's scope."""
    role = str(current_user.get("role") or "").lower()
    conditions = []
    params = []

    if role == "super_admin":
        pass
    elif role == "company_admin":
        company_id = current_user.get("company_id")
        if company_id is None:
            raise HTTPException(status_code=403, detail="Your account is not associated with a company.")
        conditions.append("a.company_id = %s")
        params.append(company_id)
    elif role == "department_head":
        company_id = current_user.get("company_id")
        department_id = current_user.get("department_id")
        if company_id is None or department_id is None:
            raise HTTPException(status_code=403, detail="Your account is not assigned to a department.")
        conditions.extend(["a.company_id = %s", "a.department_id = %s"])
        params.extend([company_id, department_id])
    else:
        raise HTTPException(status_code=403, detail="You do not have permission to view audit logs.")

    search_text = search.strip()
    if search_text:
        conditions.append("""
            (
                COALESCE(u.name, '') ILIKE %s
                OR COALESCE(a.actor_email, '') ILIKE %s
                OR a.action ILIKE %s
                OR COALESCE(c.company_name, '') ILIKE %s
                OR COALESCE(d.department_name, '') ILIKE %s
            )
        """)
        pattern = f"%{search_text}%"
        params.extend([pattern, pattern, pattern, pattern, pattern])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT COUNT(*)
                FROM audit_logs a
                LEFT JOIN users u ON u.id = a.actor_user_id
                LEFT JOIN companies c ON c.id = a.company_id
                LEFT JOIN departments d ON d.id = a.department_id
                {where_clause}
                """,
                tuple(params),
            )
            total = int(cursor.fetchone()[0] or 0)

            cursor.execute(
                f"""
                SELECT
                    a.id,
                    COALESCE(u.name, a.actor_email, 'Unknown user') AS actor_name,
                    a.actor_email,
                    a.actor_role,
                    COALESCE(c.company_name, 'Not assigned') AS company_name,
                    COALESCE(d.department_name, 'Not assigned') AS department_name,
                    a.action,
                    a.created_at
                FROM audit_logs a
                LEFT JOIN users u ON u.id = a.actor_user_id
                LEFT JOIN companies c ON c.id = a.company_id
                LEFT JOIN departments d ON d.id = a.department_id
                {where_clause}
                ORDER BY a.created_at DESC, a.id DESC
                LIMIT %s OFFSET %s
                """,
                tuple(params + [limit, offset]),
            )
            rows = cursor.fetchall()

    action_labels = {
        "logged_in": "Logged in",
        "user_created": "Added a user",
        "bookmark_added": "Added a bookmark",
        "bookmark_removed": "Removed a bookmark",
        "profile_photo_updated": "Updated profile photo",
        "scorm_attempt_started": "Started a learning activity",
        "scorm_attempt_submitted": "Submitted a learning activity",
        "lesson_progress_updated": "Updated lesson progress",
        "learning_progress_updated": "Updated learning progress",
        "course_assigned": "Assigned a course",
        "user_created": "Added a user",
        "user_updated": "Updated a user",
        "user_deleted": "Removed a user",
        "course_created": "Created a course",
        "course_updated": "Updated a course",
        "course_deleted": "Deleted a course",
        "department_created": "Created a department",
        "department_updated": "Updated a department",
        "department_deleted": "Deleted a department",
        "lesson_created": "Added a lesson",
        "lesson_updated": "Updated a lesson",
        "lesson_deleted": "Deleted a lesson",
        "enrollment_created": "Created an enrolment",
        "enrollment_updated": "Updated an enrolment",
        "enrollment_deleted": "Removed an enrolment",
        "file_created": "Uploaded a file",
        "file_updated": "Updated a file",
        "file_deleted": "Deleted a file",
        "note_created": "Added a note",
        "note_updated": "Updated a note",
        "note_deleted": "Deleted a note",
    }

    items = []
    for row in rows:
        created_at = row[7]
        action = str(row[6] or "")
        fallback_action = action.replace("_", " ").strip().capitalize() or "Activity recorded"
        items.append({
            "id": row[0],
            "actor_name": row[1],
            "actor_email": row[2] or "",
            "actor_role": row[3] or "unknown",
            "company_name": row[4],
            "department_name": row[5],
            "activity": action_labels.get(action, fallback_action),
            "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
        })

    return {"items": items, "total": total, "limit": limit, "offset": offset}
