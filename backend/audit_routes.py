from fastapi import APIRouter, Depends, HTTPException, Query

from services.auth_dependency import get_current_user
from services.postgres_db import get_db_connection
from services.audit_service import init_audit_db


router = APIRouter()


@router.get("/api/audit-logs")
def get_audit_logs(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    search: str = Query(default="", max_length=120),
    current_user=Depends(get_current_user),
):
    """Return audit events within the caller's organization/department scope."""
    role = str(current_user.get("role") or "").lower()
    conditions = []
    params = []

    if role == "super_admin":
        pass
    elif role == "company_admin":
        company_id = current_user.get("company_id")
        if company_id is None:
            raise HTTPException(status_code=403, detail="Your account is not associated with a company.")
        conditions.append("company_id = %s")
        params.append(company_id)
    elif role == "department_head":
        company_id = current_user.get("company_id")
        department_id = current_user.get("department_id")
        if company_id is None or department_id is None:
            raise HTTPException(status_code=403, detail="Your account is not assigned to a department.")
        conditions.extend(["company_id = %s", "department_id = %s"])
        params.extend([company_id, department_id])
    else:
        raise HTTPException(status_code=403, detail="You do not have permission to view audit logs.")

    search_text = search.strip()
    if search_text:
        conditions.append("""
            (
                actor_email ILIKE %s
                OR action ILIKE %s
                OR resource ILIKE %s
                OR endpoint ILIKE %s
            )
        """)
        pattern = f"%{search_text}%"
        params.extend([pattern, pattern, pattern, pattern])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                f"SELECT COUNT(*) FROM audit_logs {where_clause}",
                tuple(params),
            )
            total = int(cursor.fetchone()[0] or 0)

            cursor.execute(
                f"""
                SELECT
                    id, actor_user_id, actor_email, actor_role,
                    action, resource, resource_id, method, endpoint,
                    status_code, ip_address, created_at
                FROM audit_logs
                {where_clause}
                ORDER BY created_at DESC, id DESC
                LIMIT %s OFFSET %s
                """,
                tuple(params + [limit, offset]),
            )
            rows = cursor.fetchall()

    items = []
    for row in rows:
        created_at = row[11]
        items.append({
            "id": row[0],
            "actor_user_id": row[1],
            "actor_email": row[2],
            "actor_role": row[3],
            "action": row[4],
            "resource": row[5],
            "resource_id": row[6],
            "method": row[7],
            "endpoint": row[8],
            "status_code": row[9],
            "ip_address": row[10],
            "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
        })

    return {"items": items, "total": total, "limit": limit, "offset": offset}
