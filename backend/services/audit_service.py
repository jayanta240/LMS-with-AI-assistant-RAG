import logging
import re

from services.auth_service import decode_token
from services.postgres_db import get_db_connection


_logger = logging.getLogger("lms.audit")

_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_IGNORED_PATH_PREFIXES = (
    "/api/chat",
    "/api/assistant",
    "/api/learning-time",
    "/api/notifications",
    "/api/auth/login",
    "/api/auth/register",
    "/api/sessions",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
)


def init_audit_db():
    """Create the persistent audit trail table and its lookup indexes."""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id BIGSERIAL PRIMARY KEY,
                    actor_user_id INTEGER,
                    actor_email TEXT,
                    actor_role TEXT NOT NULL,
                    company_id INTEGER,
                    department_id INTEGER,
                    action TEXT NOT NULL,
                    resource TEXT NOT NULL,
                    resource_id TEXT,
                    method TEXT NOT NULL,
                    endpoint TEXT NOT NULL,
                    status_code INTEGER NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created
                ON audit_logs (company_id, created_at DESC)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_audit_logs_department_created
                ON audit_logs (department_id, created_at DESC)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
                ON audit_logs (actor_user_id, created_at DESC)
            """)


def record_audit_event(
    *,
    actor_user_id=None,
    actor_email=None,
    actor_role="unknown",
    company_id=None,
    department_id=None,
    action,
    resource,
    resource_id=None,
    method,
    endpoint,
    status_code,
    ip_address=None,
    user_agent=None,
):
    """Persist a concise event record; never store request bodies or secrets."""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO audit_logs (
                    actor_user_id, actor_email, actor_role,
                    company_id, department_id, action, resource,
                    resource_id, method, endpoint, status_code,
                    ip_address, user_agent
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                actor_user_id,
                actor_email,
                actor_role,
                company_id,
                department_id,
                action,
                resource,
                str(resource_id) if resource_id is not None else None,
                method,
                endpoint,
                status_code,
                ip_address,
                user_agent,
            ))


def _describe_event(method, endpoint, path):
    endpoint_lower = endpoint.lower()
    path_parts = [part for part in path.split("/") if part and part != "api"]
    numeric_ids = re.findall(r"/(\d+)(?:/|$)", path)

    if "progress" in endpoint_lower or "complete" in endpoint_lower:
        return "learning_progress_updated", "learning_progress", numeric_ids[-1] if numeric_ids else None

    resource_name = path_parts[0].lower() if path_parts else "platform"
    resource = {
        "users": "user",
        "companies": "company",
        "departments": "department",
        "courses": "course",
        "lessons": "lesson",
        "enrollments": "enrollment",
        "bookmarks": "bookmark",
        "notes": "note",
        "notifications": "notification",
        "scorm": "scorm_content",
        "files": "file",
        "issues": "issue",
    }.get(resource_name, resource_name.rstrip("s") or "platform")

    if path == "/api/auth/register":
        return "user_created", "user", None
    if path == "/api/enrollments":
        return "course_assigned", "enrollment", None

    action = {
        "POST": f"{resource}_created",
        "PUT": f"{resource}_updated",
        "PATCH": f"{resource}_updated",
        "DELETE": f"{resource}_deleted",
    }.get(method, f"{resource}_changed")
    return action, resource, numeric_ids[-1] if numeric_ids else None


async def audit_request_middleware(request, call_next):
    """Record successful authenticated write actions without inspecting bodies."""
    response = await call_next(request)
    path = request.url.path
    method = request.method.upper()

    if (
        not path.startswith("/api/")
        or method not in _MUTATING_METHODS
        or response.status_code >= 400
        or any(path.startswith(prefix) for prefix in _IGNORED_PATH_PREFIXES)
    ):
        return response

    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return response

    payload = decode_token(token)
    if not payload:
        return response

    role = str(payload.get("role") or "").lower()
    if role not in {"super_admin", "company_admin", "department_head", "employee"}:
        return response

    route = request.scope.get("route")
    endpoint = getattr(route, "path", path)
    action, resource, resource_id = _describe_event(method, endpoint, path)
    client = request.client
    user_agent = request.headers.get("user-agent")

    try:
        record_audit_event(
            actor_user_id=payload.get("user_id"),
            actor_email=payload.get("email"),
            actor_role=role,
            company_id=payload.get("company_id"),
            department_id=payload.get("department_id"),
            action=action,
            resource=resource,
            resource_id=resource_id,
            method=method,
            endpoint=endpoint,
            status_code=response.status_code,
            ip_address=client.host if client else None,
            user_agent=user_agent,
        )
    except Exception:
        # Auditing must not turn a successful LMS operation into a failed one.
        _logger.exception("Could not persist audit event for %s %s", method, endpoint)

    return response
