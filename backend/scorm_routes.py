"""Secure SCORM 1.2 package management and attempt tracking for the LMS.

SCORM packages are untrusted ZIP archives. Uploads are validated and extracted
into an isolated persistent volume; package records and learner attempts are
scoped by company and authenticated user.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import stat
import tempfile
import uuid
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path, PurePosixPath
from typing import Any
from xml.etree import ElementTree as ET

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field

from services.auth_dependency import get_current_user
from services.course_db import (
    get_course,
    get_course_progress,
    create_certificate,
    update_certificate_pdf_url,
)
from services.company_db import get_company, get_company_branding
from services.user_db import get_user_by_id
from services.notification_db import create_notification, get_notification_settings
from services.certificate_service import generate_certificate_pdf
from services.enrollment_db import get_user_course_ids
from services.postgres_db import get_db_connection

router = APIRouter(prefix="/api/scorm", tags=["SCORM"])
STORAGE_ROOT = Path(os.getenv("SCORM_STORAGE_PATH", "/app/scorm_storage")).resolve()
MAX_UPLOAD_BYTES = int(os.getenv("SCORM_MAX_UPLOAD_BYTES", str(250 * 1024 * 1024)))
MAX_EXPANDED_BYTES = int(os.getenv("SCORM_MAX_EXPANDED_BYTES", str(1024 * 1024 * 1024)))
MAX_ARCHIVE_ENTRIES = int(os.getenv("SCORM_MAX_ARCHIVE_ENTRIES", "5000"))
MAX_COMPRESSION_RATIO = 200
MAX_HTML_INJECTION_BYTES = 20 * 1024 * 1024
TICKET_COOKIE = "lms_scorm_ticket"
TICKET_TTL_MINUTES = 480
SUPPORTED_VERSION = "1.2"


def init_scorm_db() -> None:
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS scorm_packages (
                    id UUID PRIMARY KEY,
                    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    version TEXT NOT NULL,
                    launch_path TEXT NOT NULL,
                    mastery_score NUMERIC(6,2),
                    storage_path TEXT NOT NULL,
                    package_size BIGINT NOT NULL,
                    created_by INTEGER NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE(id, company_id)
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_scorm_packages_course_company
                ON scorm_packages(course_id, company_id)
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS scorm_attempts (
                    id UUID PRIMARY KEY,
                    package_id UUID NOT NULL REFERENCES scorm_packages(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL,
                    company_id INTEGER NOT NULL,
                    attempt_number INTEGER NOT NULL,
                    cmi_data JSONB NOT NULL DEFAULT '{}'::jsonb,
                    completion_status TEXT NOT NULL DEFAULT 'not attempted',
                    success_status TEXT NOT NULL DEFAULT 'unknown',
                    score_raw NUMERIC(8,3),
                    total_time TEXT NOT NULL DEFAULT '0000:00:00.00',
                    session_time TEXT NOT NULL DEFAULT '0000:00:00.00',
                    suspend_data TEXT NOT NULL DEFAULT '',
                    lesson_location TEXT NOT NULL DEFAULT '',
                    lesson_status TEXT NOT NULL DEFAULT 'not attempted',
                    exit_mode TEXT NOT NULL DEFAULT '',
                    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    completed_at TIMESTAMPTZ,
                    UNIQUE(package_id, user_id, attempt_number)
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_scorm_attempts_user_package
                ON scorm_attempts(user_id, package_id, attempt_number DESC)
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS scorm_launch_tickets (
                    ticket_hash TEXT PRIMARY KEY,
                    package_id UUID NOT NULL REFERENCES scorm_packages(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL,
                    company_id INTEGER NOT NULL,
                    expires_at TIMESTAMPTZ NOT NULL,
                    attempt_id UUID REFERENCES scorm_attempts(id) ON DELETE CASCADE
                )
            """)
            cur.execute("ALTER TABLE scorm_launch_tickets ADD COLUMN IF NOT EXISTS attempt_id UUID REFERENCES scorm_attempts(id) ON DELETE CASCADE")
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_scorm_tickets_expiry
                ON scorm_launch_tickets(expires_at)
            """)


def _content_origin(request: Request) -> str:
    configured = os.getenv("SCORM_CONTENT_ORIGIN", "").strip().rstrip("/")
    if configured:
        if not re.fullmatch(r"https?://[-A-Za-z0-9.:]+", configured):
            raise HTTPException(status_code=500, detail="SCORM_CONTENT_ORIGIN must be an origin without a path.")
        return configured
    proto = request.headers.get("x-forwarded-proto", request.url.scheme).split(",")[0].strip().lower()
    if proto not in {"http", "https"}:
        proto = "http"
    host = request.headers.get("host", "")
    if not host or not re.fullmatch(r"[-A-Za-z0-9.:]+", host):
        raise HTTPException(status_code=400, detail="Invalid host for SCORM content delivery.")
    return f"{proto}://{host}"


def _company_id(user: dict) -> int:
    value = user.get("company_id")
    if value is None:
        raise HTTPException(status_code=403, detail="Your account is not associated with a company.")
    return int(value)


def _get_course_for_role(course_id: int, user: dict):
    role = user.get("role")
    company_id = user.get("company_id")
    if role == "super_admin":
        course = get_course(course_id)
    elif role == "company_admin":
        if company_id is None:
            raise HTTPException(status_code=403, detail="Company information is missing.")
        course = get_course(course_id, company_id=int(company_id))
    elif role == "department_head":
        department_id = user.get("department_id")
        if company_id is None or department_id is None:
            raise HTTPException(status_code=403, detail="Company or department information is missing.")
        course = get_course(course_id, company_id=int(company_id), department_id=int(department_id))
    elif role == "employee":
        course = get_course(course_id)
        if course:
            visibility = course[13] or "private"
            course_company = course[5]
            course_department = course[19] if len(course) > 19 else None
            if course_department is not None and visibility != "public" and user.get("department_id") != course_department:
                raise HTTPException(status_code=403, detail="This course is restricted to its assigned department.")
            if visibility == "private" and course_id not in get_user_course_ids(int(user["user_id"])):
                raise HTTPException(status_code=403, detail="This private course is not assigned to you.")
            if visibility == "organization" and user.get("company_id") != course_company:
                raise HTTPException(status_code=403, detail="This course is only available within its organization.")
            if visibility not in {"private", "organization", "public"}:
                raise HTTPException(status_code=403, detail="Course visibility is not configured correctly.")
    else:
        raise HTTPException(status_code=403, detail="Permission denied.")
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    return course


def _package_row(package_id: str, user: dict):
    try:
        parsed_id = str(uuid.UUID(package_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="SCORM package not found.")
    if user.get("role") == "super_admin":
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, course_id, company_id, title, version, launch_path,
                           mastery_score, storage_path, package_size, created_at
                    FROM scorm_packages WHERE id = %s
                """, (parsed_id,))
                row = cur.fetchone()
    else:
        company_id = _company_id(user)
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, course_id, company_id, title, version, launch_path,
                           mastery_score, storage_path, package_size, created_at
                    FROM scorm_packages WHERE id = %s AND company_id = %s
                """, (parsed_id, company_id))
                row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="SCORM package not found.")
    _get_course_for_role(int(row[1]), user)
    return row


def _manifest_info(zf: zipfile.ZipFile) -> dict[str, Any]:
    manifests = [name for name in zf.namelist() if name.lower() == "imsmanifest.xml"]
    if len(manifests) != 1:
        raise HTTPException(status_code=400, detail="The ZIP must contain exactly one imsmanifest.xml at its root.")
    if zf.getinfo(manifests[0]).file_size > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="imsmanifest.xml exceeds the size limit.")
    try:
        root = ET.fromstring(zf.read(manifests[0]))
    except (ET.ParseError, KeyError):
        raise HTTPException(status_code=400, detail="imsmanifest.xml is invalid XML.")
    def local_name(tag: str) -> str:
        return tag.rsplit("}", 1)[-1].lower()
    def first_text(node, name):
        for element in node.iter():
            if local_name(element.tag) == name and element.text and element.text.strip():
                return element.text.strip()
        return None
    schema = first_text(root, "schema")
    version = first_text(root, "schemaversion")
    if (schema or "").strip().lower() != "adl scorm" or (version or "").strip() != SUPPORTED_VERSION:
        raise HTTPException(status_code=400, detail="Only SCORM 1.2 packages are supported in this release.")
    resources = [node for node in root.iter() if local_name(node.tag) == "resource"]
    sco = next((node for node in resources if any(
        key.rsplit("}", 1)[-1].lower() == "scormtype" and value.lower() == "sco"
        for key, value in node.attrib.items()
    )), None)
    if sco is None:
        raise HTTPException(status_code=400, detail="The manifest does not define a SCORM 1.2 SCO resource.")
    href = sco.attrib.get("href")
    if not href:
        raise HTTPException(status_code=400, detail="The SCORM launch resource has no href.")
    title = first_text(root, "title") or "SCORM learning activity"
    mastery = None
    for node in root.iter():
        if local_name(node.tag) == "masteryscore" and node.text:
            try:
                mastery = float(node.text.strip())
            except ValueError:
                pass
            break
    return {"title": title[:250], "launch_path": href, "mastery_score": mastery}


def _validate_archive(zf: zipfile.ZipFile) -> tuple[dict[str, Any], int]:
    infos = zf.infolist()
    if not infos or len(infos) > MAX_ARCHIVE_ENTRIES:
        raise HTTPException(status_code=400, detail=f"Archive must contain between 1 and {MAX_ARCHIVE_ENTRIES} entries.")
    expanded = 0
    normalized_names = set()
    for info in infos:
        name = info.filename
        posix = PurePosixPath(name.replace("\\", "/"))
        if posix.is_absolute() or not name or any(part in {"..", ""} for part in posix.parts):
            raise HTTPException(status_code=400, detail="Archive contains an unsafe file path.")
        if re.match(r"^[a-zA-Z]:", name) or "\x00" in name:
            raise HTTPException(status_code=400, detail="Archive contains an unsafe file path.")
        canonical = str(posix)
        if canonical in normalized_names:
            raise HTTPException(status_code=400, detail="Archive contains duplicate file paths.")
        normalized_names.add(canonical)
        mode = (info.external_attr >> 16) & 0xFFFF
        if stat.S_ISLNK(mode):
            raise HTTPException(status_code=400, detail="Symbolic links are not allowed in SCORM packages.")
        expanded += info.file_size
        if info.flag_bits & 0x1:
            raise HTTPException(status_code=400, detail="Encrypted ZIP entries are not supported.")
        if info.file_size > 0 and info.compress_size == 0:
            raise HTTPException(status_code=400, detail="Archive has an invalid compression ratio.")
        if info.compress_size > 0 and info.file_size / info.compress_size > MAX_COMPRESSION_RATIO:
            raise HTTPException(status_code=400, detail="Archive compression ratio exceeds the safety limit.")
        if expanded > MAX_EXPANDED_BYTES:
            raise HTTPException(status_code=413, detail="Extracted SCORM package exceeds the configured size limit.")
    manifest = _manifest_info(zf)
    launch = PurePosixPath(manifest["launch_path"].replace("\\", "/"))
    if launch.is_absolute() or any(part in {"..", ""} for part in launch.parts):
        raise HTTPException(status_code=400, detail="Manifest launch path is unsafe.")
    names = {str(PurePosixPath(info.filename.replace("\\", "/"))) for info in infos if not info.is_dir()}
    if str(launch) not in names:
        raise HTTPException(status_code=400, detail="The manifest launch file is missing from the ZIP.")
    return manifest, expanded


def _ticket_row(ticket: str | None, package_id: str):
    if not ticket:
        raise HTTPException(status_code=401, detail="SCORM launch ticket is missing or expired.")
    ticket_hash = __import__("hashlib").sha256(ticket.encode("utf-8")).hexdigest()
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT user_id, company_id, expires_at, attempt_id
                FROM scorm_launch_tickets
                WHERE ticket_hash = %s AND package_id = %s AND expires_at > NOW()
            """, (ticket_hash, package_id))
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="SCORM launch ticket is invalid or expired.")
    return row


class AttemptStartRequest(BaseModel):
    package_id: uuid.UUID


class AttemptCommitRequest(BaseModel):
    attempt_id: uuid.UUID
    cmi: dict[str, Any] = Field(default_factory=dict)
    finish: bool = False


@router.post("/courses/{course_id}/packages")
async def upload_scorm_package(
    course_id: int,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    if current_user.get("role") not in {"company_admin", "department_head"}:
        raise HTTPException(status_code=403, detail="Only company admins and department heads can upload SCORM packages.")
    _get_course_for_role(course_id, current_user)
    company_id = _company_id(current_user)
    filename = (file.filename or "").lower()
    if not filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Upload a SCORM .zip package.")
    package_id = uuid.uuid4()
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix="scorm-stage-", dir=str(STORAGE_ROOT)))
    archive_path = stage / "package.zip"
    final_path = STORAGE_ROOT / str(package_id)
    try:
        size = 0
        with archive_path.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="SCORM ZIP exceeds the upload size limit.")
                out.write(chunk)
        if size == 0:
            raise HTTPException(status_code=400, detail="The uploaded ZIP is empty.")
        try:
            with zipfile.ZipFile(archive_path) as zf:
                manifest, expanded_size = _validate_archive(zf)
                extract_dir = stage / "content"
                extract_dir.mkdir()
                actual_expanded_size = 0
                for info in zf.infolist():
                    target = (extract_dir / PurePosixPath(info.filename.replace("\\", "/"))).resolve()
                    if not target.is_relative_to(extract_dir.resolve()):
                        raise HTTPException(status_code=400, detail="Archive contains an unsafe file path.")
                    if info.is_dir():
                        target.mkdir(parents=True, exist_ok=True)
                    else:
                        target.parent.mkdir(parents=True, exist_ok=True)
                        written_for_file = 0
                        with zf.open(info) as source, target.open("wb") as destination:
                            while True:
                                chunk = source.read(1024 * 1024)
                                if not chunk:
                                    break
                                written_for_file += len(chunk)
                                actual_expanded_size += len(chunk)
                                if written_for_file > info.file_size or actual_expanded_size > MAX_EXPANDED_BYTES:
                                    raise HTTPException(status_code=413, detail="Archive expands beyond its declared or configured size limit.")
                                destination.write(chunk)
                        if written_for_file != info.file_size:
                            raise HTTPException(status_code=400, detail="Archive entry size does not match its manifest.")
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="The uploaded file is not a valid ZIP archive.")
        except (RuntimeError, NotImplementedError) as exc:
            raise HTTPException(status_code=400, detail="The ZIP uses unsupported compression or encryption.") from exc
        shutil.rmtree(archive_path, ignore_errors=True)
        os.replace(extract_dir, final_path)
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO scorm_packages
                    (id, course_id, company_id, title, version, launch_path, mastery_score,
                     storage_path, package_size, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (str(package_id), course_id, company_id, manifest["title"], SUPPORTED_VERSION,
                      manifest["launch_path"], manifest["mastery_score"], str(final_path), expanded_size,
                      int(current_user["user_id"])))
        return {"success": True, "package": {
            "id": str(package_id), "course_id": course_id, "title": manifest["title"],
            "version": SUPPORTED_VERSION, "launch_path": manifest["launch_path"],
            "mastery_score": manifest["mastery_score"], "package_size": expanded_size,
        }}
    except Exception:
        shutil.rmtree(final_path, ignore_errors=True)
        raise
    finally:
        shutil.rmtree(stage, ignore_errors=True)
        await file.close()


@router.get("/courses/{course_id}/packages")
def list_course_scorm_packages(course_id: int, current_user=Depends(get_current_user)):
    course = _get_course_for_role(course_id, current_user)
    company_id = int(course[5]) if current_user.get("role") == "super_admin" else _company_id(current_user)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, title, version, launch_path, mastery_score, package_size, created_at
                FROM scorm_packages WHERE course_id = %s AND company_id = %s ORDER BY created_at DESC
            """, (course_id, company_id))
            rows = cur.fetchall()
    return [{"id": str(r[0]), "title": r[1], "version": r[2], "launch_path": r[3],
             "mastery_score": float(r[4]) if r[4] is not None else None,
             "package_size": r[5], "created_at": r[6].isoformat() if r[6] else None}
            for r in rows]


@router.post("/packages/{package_id}/launch-ticket")
def create_launch_ticket(package_id: str, response: Response, attempt_id: uuid.UUID, request: Request, current_user=Depends(get_current_user)):
    row = _package_row(package_id, current_user)
    company_id = _company_id(current_user)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM scorm_attempts WHERE id = %s AND package_id = %s AND user_id = %s AND company_id = %s",
                        (str(attempt_id), str(row[0]), int(current_user["user_id"]), company_id))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="SCORM attempt not found.")
            cur.execute("UPDATE scorm_attempts SET exit_mode = '', session_time = '0000:00:00.00', last_accessed_at = NOW() WHERE id = %s AND user_id = %s AND company_id = %s",
                        (str(attempt_id), int(current_user["user_id"]), company_id))
    ticket = uuid.uuid4().hex + uuid.uuid4().hex
    ticket_hash = __import__("hashlib").sha256(ticket.encode("utf-8")).hexdigest()
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM scorm_launch_tickets WHERE expires_at <= NOW()")
            cur.execute("""
                INSERT INTO scorm_launch_tickets(ticket_hash, package_id, user_id, company_id, expires_at, attempt_id)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (ticket_hash, str(row[0]), int(current_user["user_id"]), company_id,
                  datetime.now(timezone.utc) + timedelta(minutes=TICKET_TTL_MINUTES), str(attempt_id)))
    response.set_cookie(
        key=TICKET_COOKIE, value=ticket, httponly=True, secure=(request.headers.get("x-forwarded-proto") == "https" or os.getenv("SCORM_COOKIE_SECURE", "false").lower() == "true"),
        samesite="lax", max_age=TICKET_TTL_MINUTES * 60,
        path=f"/api/scorm/packages/{row[0]}/",
    )
    return {"launch_url": f"/api/scorm/packages/{row[0]}/launch", "package_id": str(row[0])}


@router.get("/packages/{package_id}/launch")
def launch_scorm_package(package_id: str, request: Request):
    try:
        parsed_id = str(uuid.UUID(package_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="SCORM package not found.")
    ticket = request.cookies.get(TICKET_COOKIE)
    ticket_data = _ticket_row(ticket, parsed_id)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT storage_path, launch_path FROM scorm_packages WHERE id = %s AND company_id = %s",
                        (parsed_id, int(ticket_data[1])))
            package = cur.fetchone()
    if not package:
        raise HTTPException(status_code=404, detail="SCORM package not found.")
    root = Path(package[0]).resolve()
    launch_file = (root / PurePosixPath(package[1])).resolve()
    if not launch_file.is_relative_to(root) or not launch_file.is_file():
        raise HTTPException(status_code=404, detail="SCORM launch file is unavailable.")
    return RedirectResponse(
        url=f"/api/scorm/packages/{parsed_id}/{PurePosixPath(package[1]).as_posix()}",
        status_code=307,
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )


@router.post("/attempts/start")
def start_scorm_attempt(data: AttemptStartRequest, current_user=Depends(get_current_user)):
    package = _package_row(str(data.package_id), current_user)
    user_id = int(current_user["user_id"])
    company_id = _company_id(current_user)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Serialize attempt-number allocation for concurrent launches by the same learner.
            cur.execute("SELECT id FROM users WHERE id = %s FOR UPDATE", (user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Learner account not found.")
            cur.execute("""
                SELECT id, attempt_number, cmi_data, completion_status, success_status,
                       score_raw, total_time, suspend_data, lesson_location
                FROM scorm_attempts
                WHERE package_id = %s AND user_id = %s AND company_id = %s
                  AND completion_status NOT IN ('completed', 'passed', 'failed')
                ORDER BY attempt_number DESC LIMIT 1
            """, (str(package[0]), user_id, company_id))
            row = cur.fetchone()
            if row:
                attempt = {"id": str(row[0]), "attempt_number": row[1],
                           "cmi": row[2] or {}, "completion_status": row[3],
                           "success_status": row[4], "score_raw": float(row[5]) if row[5] is not None else None,
                           "total_time": row[6], "suspend_data": row[7], "lesson_location": row[8]}
            else:
                cur.execute("SELECT COALESCE(MAX(attempt_number), 0) + 1 FROM scorm_attempts WHERE package_id = %s AND user_id = %s",
                            (str(package[0]), user_id))
                number = cur.fetchone()[0]
                attempt_id = uuid.uuid4()
                cur.execute("""
                    INSERT INTO scorm_attempts(id, package_id, user_id, company_id, attempt_number)
                    VALUES (%s, %s, %s, %s, %s)
                """, (str(attempt_id), str(package[0]), user_id, company_id, number))
                attempt = {"id": str(attempt_id), "attempt_number": number, "cmi": {},
                           "completion_status": "not attempted", "success_status": "unknown",
                           "score_raw": None, "total_time": "0000:00:00.00",
                           "suspend_data": "", "lesson_location": ""}
    return {"success": True, "attempt": attempt, "mastery_score": float(package[6]) if package[6] is not None else None}


def _parse_scorm_time(value: str) -> float:
    """Parse SCORM 1.2 HHHH:MM:SS.ss timespans into seconds."""
    try:
        hours, minutes, seconds = value.split(":")
        return max(0.0, int(hours) * 3600 + int(minutes) * 60 + float(seconds))
    except (ValueError, TypeError):
        return 0.0


def _format_scorm_time(seconds: float) -> str:
    seconds = max(0.0, seconds)
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    remainder = seconds % 60
    return f"{hours:04d}:{minutes:02d}:{remainder:05.2f}"


def _issue_certificate_if_course_complete(user_id: int, course_id: int, company_id: int, background_tasks: BackgroundTasks):
    progress = get_course_progress(user_id, course_id)
    if not progress or progress.get("total", 0) <= 0 or progress.get("completed", 0) < progress.get("total", 0):
        return None
    course = get_course(course_id, company_id=company_id)
    user = get_user_by_id(user_id)
    company = get_company(company_id)
    if not course or not user:
        return None
    course_title = course[1] or "Course"
    user_name = user[1] or "Learner"
    company_name = company[1] if company and len(company) > 1 and company[1] else "Company"
    branding = get_company_branding(company_id)
    if not isinstance(branding, dict):
        branding = {}
    logo_url = branding.get("logo_url") or ""
    primary_color = branding.get("primary_color") or "#FBBF24"
    secondary_color = branding.get("secondary_color") or "#0F172A"
    accent_color = branding.get("accent_color") or "#F59E0B"
    certificate = create_certificate(
        user_id=user_id,
        course_id=course_id,
        company_id=company_id,
        user_name=user_name,
        course_title=course_title,
        company_name=company_name,
        logo_url=logo_url,
        primary_color=primary_color,
        secondary_color=secondary_color,
        accent_color=accent_color,
    )
    if not certificate:
        return None
    if not certificate.get("pdf_url"):
        try:
            pdf_url = generate_certificate_pdf(certificate={
                **certificate,
                "user_name": user_name,
                "course_title": course_title,
                "company_name": company_name,
                "logo_url": logo_url,
                "primary_color": primary_color,
                "secondary_color": secondary_color,
                "accent_color": accent_color,
            })
            update_certificate_pdf_url(certificate_id=certificate["id"], pdf_url=pdf_url)
            certificate["pdf_url"] = pdf_url
        except Exception:
            # The course remains completed even if PDF generation must be retried.
            pass
    if not certificate.get("already_exists"):
        try:
            create_notification(
                user_id=user_id, company_id=company_id,
                title="Certificate issued",
                message=f"Your certificate for “{course_title}” is ready.",
                notification_type="certificate", link="/learning/dashboard",
            )
            settings = get_notification_settings(company_id)
            if settings.get("certificate_email") and user[2] and certificate.get("pdf_url"):
                from services.email_service import send_certificate_email
                background_tasks.add_task(
                    send_certificate_email,
                    user[2], user_name, course_title, certificate["pdf_url"],
                    certificate.get("certificate_number", ""),
                )
        except Exception:
            pass
    return certificate


@router.post("/attempts/commit")
def commit_scorm_attempt(
    data: AttemptCommitRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    user_id = int(current_user["user_id"])
    company_id = _company_id(current_user)
    cmi = data.cmi
    if any(
        not isinstance(key, str)
        or not key.startswith("cmi.")
        or any(part in {"__proto__", "prototype", "constructor"} for part in key.split("."))
        for key in cmi
    ):
        raise HTTPException(status_code=400, detail="SCORM data contains an invalid CMI element.")
    if any(isinstance(value, (dict, list)) for value in cmi.values()):
        raise HTTPException(status_code=400, detail="SCORM CMI values must be scalar values.")
    if len(json.dumps(cmi, ensure_ascii=False)) > 128 * 1024:
        raise HTTPException(status_code=413, detail="SCORM runtime data exceeds the storage limit.")
    allowed_status = {"not attempted", "incomplete", "completed", "passed", "failed", "browsed"}
    lesson_status = str(cmi.get("cmi.core.lesson_status", "incomplete")).lower()
    if lesson_status not in allowed_status:
        lesson_status = "incomplete"
    success_status = "unknown"
    if lesson_status == "passed":
        success_status = "passed"
    elif lesson_status == "failed":
        success_status = "failed"
    raw_score = cmi.get("cmi.core.score.raw")
    try:
        score = float(raw_score) if raw_score not in (None, "") else None
        if score is not None and not (-100000 <= score <= 100000):
            raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid SCORM score.")
    terminal_status = lesson_status in {"completed", "passed", "failed"}
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT p.mastery_score, a.total_time, a.exit_mode, p.course_id FROM scorm_attempts a JOIN scorm_packages p ON p.id = a.package_id WHERE a.id = %s AND a.user_id = %s AND a.company_id = %s",
                        (str(data.attempt_id), user_id, company_id))
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="SCORM attempt not found.")
            package_course_id = int(existing[3])
            mastery_score = float(existing[0]) if existing[0] is not None else None
            if lesson_status == "completed" and score is not None and mastery_score is not None:
                success_status = "passed" if score >= mastery_score else "failed"
            previous_total = _parse_scorm_time(existing[1] or "0000:00:00.00")
            session_seconds = _parse_scorm_time(str(cmi.get("cmi.core.session_time", "0000:00:00.00")))
            add_session_time = data.finish and existing[2] != "FINISH"
            total_time = _format_scorm_time(previous_total + session_seconds) if add_session_time else (existing[1] or "0000:00:00.00")
            exit_mode = "FINISH" if data.finish else str(cmi.get("cmi.core.exit", ""))
            cur.execute("""
                UPDATE scorm_attempts
                SET cmi_data = %s::jsonb,
                    completion_status = %s,
                    success_status = %s,
                    score_raw = %s,
                    total_time = %s,
                    session_time = COALESCE(NULLIF(%s, ''), session_time),
                    suspend_data = LEFT(COALESCE(%s, ''), 64000),
                    lesson_location = LEFT(COALESCE(%s, ''), 1000),
                    lesson_status = %s,
                    exit_mode = LEFT(COALESCE(%s, ''), 32),
                    last_accessed_at = NOW(),
                    completed_at = CASE WHEN %s THEN COALESCE(completed_at, NOW()) ELSE completed_at END
                WHERE id = %s AND user_id = %s AND company_id = %s
                RETURNING id, package_id
            """, (json.dumps(cmi), lesson_status, success_status, score,
                  total_time, str(cmi.get("cmi.core.session_time", "")),
                  str(cmi.get("cmi.suspend_data", "")), str(cmi.get("cmi.core.lesson_location", "")),
                  lesson_status, exit_mode, terminal_status,
                  str(data.attempt_id), user_id, company_id))
            saved = cur.fetchone()
    if not saved:
        raise HTTPException(status_code=404, detail="SCORM attempt not found.")
    certificate = None
    if terminal_status and success_status != "failed":
        try:
            certificate = _issue_certificate_if_course_complete(user_id, int(package_course_id), company_id, background_tasks)
        except Exception:
            # SCORM progress is committed; certificate failures must not roll back learning progress.
            certificate = None
    return {"success": True, "attempt_id": str(saved[0]), "completion_status": lesson_status,
            "success_status": success_status, "score_raw": score, "completed": terminal_status,
            "finished": data.finish, "certificate": certificate}


@router.get("/packages/{package_id}/attempts/me")
def my_scorm_attempts(package_id: str, current_user=Depends(get_current_user)):
    package = _package_row(package_id, current_user)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, attempt_number, completion_status, success_status, score_raw,
                       total_time, lesson_location, started_at, last_accessed_at, completed_at
                FROM scorm_attempts
                WHERE package_id = %s AND user_id = %s AND company_id = %s
                ORDER BY attempt_number DESC
            """, (str(package[0]), int(current_user["user_id"]), _company_id(current_user)))
            rows = cur.fetchall()
    return [{"id": str(r[0]), "attempt_number": r[1], "completion_status": r[2],
             "success_status": r[3], "score_raw": float(r[4]) if r[4] is not None else None,
             "total_time": r[5], "lesson_location": r[6],
             "started_at": r[7].isoformat() if r[7] else None,
             "last_accessed_at": r[8].isoformat() if r[8] else None,
             "completed_at": r[9].isoformat() if r[9] else None} for r in rows]



def _scorm_runtime_script(package_id: str, attempt_id: str, initial_cmi: dict[str, Any]) -> str:
    """Provide the synchronous SCORM 1.2 API inside the sandboxed SCO frame."""
    seed = json.dumps(initial_cmi or {}, ensure_ascii=False).replace("</", "<\\/")
    package_json = json.dumps(package_id)
    attempt_json = json.dumps(attempt_id)
    return """<script>
(function(){
  var seed = __SEED__;
  var packageId = __PACKAGE__;
  var attemptId = __ATTEMPT__;
  var initialized = false, lastError = "0";
  var values = Object.assign({
    "cmi._children": "core,suspend_data,launch_data,comments,comments_from_lms,objectives,student_data,student_preference,interactions",
    "cmi.core._children": "student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time",
    "cmi.core.score._children": "raw,min,max",
    "cmi.core.student_data._children": "mastery_score,max_time_allowed,time_limit_action",
    "cmi.core.student_data.max_time_allowed": "",
    "cmi.core.student_data.time_limit_action": "continue,no message",
    "cmi.student_preference._children": "audio,language,speed,text",
    "cmi.student_preference.audio": "0",
    "cmi.student_preference.language": "",
    "cmi.student_preference.speed": "0",
    "cmi.student_preference.text": "0",
    "cmi.comments": "",
    "cmi.comments_from_lms": "",
    "cmi.objectives._children": "id,score,status",
    "cmi.interactions._children": "id,objectives,time,type,correct_responses,weighting,student_response,result,latency",
    "cmi.core.student_id": "",
    "cmi.core.student_name": "",
    "cmi.core.lesson_location": "",
    "cmi.core.credit": "credit",
    "cmi.core.lesson_status": "not attempted",
    "cmi.core.entry": "ab-initio",
    "cmi.core.score.raw": "",
    "cmi.core.score.max": "",
    "cmi.core.score.min": "",
    "cmi.core.total_time": "0000:00:00.00",
    "cmi.core.session_time": "0000:00:00.00",
    "cmi.core.lesson_mode": "normal",
    "cmi.core.exit": "",
    "cmi.suspend_data": "",
    "cmi.launch_data": "",
    "cmi.core.student_data.mastery_score": "",
    "cmi.interactions._count": "0",
    "cmi.objectives._count": "0"
  }, seed);
  var writable = /^(cmi\.core\.(lesson_location|lesson_status|score\.(raw|min|max)|session_time|exit)|cmi\.suspend_data|cmi\.comments$|cmi\.student_preference\.|cmi\.interactions\.|cmi\.objectives\.)/;
  function send(finish){ try { window.parent.postMessage({type:"lms-scorm-commit", packageId:packageId, attemptId:attemptId, cmi:values, finish:!!finish}, "*"); } catch(e){} }
  function dynamicCount(prefix) {
    var max = -1;
    Object.keys(values).forEach(function(key) {
      var match = key.match(new RegExp("^" + prefix.replace(/\./g, "\\.") + "\\.(\\d+)\\."));
      if (match) max = Math.max(max, Number(match[1]));
    });
    return String(max + 1);
  }
  window.API = {
    LMSInitialize:function(){ if(initialized){lastError="101";return "false";} initialized=true; lastError="0"; return "true"; },
    LMSFinish:function(){ if(!initialized){lastError="301";return "false";} values["cmi.core.exit"]=values["cmi.core.exit"]||"suspend"; send(true); initialized=false; lastError="0"; return "true"; },
    LMSGetValue:function(key){
      if(!initialized){lastError="301";return "";}
      if(key === "cmi.interactions._count") values[key] = dynamicCount("cmi.interactions");
      if(key === "cmi.objectives._count") values[key] = dynamicCount("cmi.objectives");
      if(key in values){lastError="0";return String(values[key]==null?"":values[key]);}
      if(/^cmi\.(interactions|objectives)\.\d+\..+_count$/.test(key)){lastError="0";return "0";}
      if(/^cmi\.(interactions|objectives)\.\d+\./.test(key)){lastError="0";return "";}
      lastError="401";return "";
    },
    LMSSetValue:function(key,value){
      if(!initialized){lastError="301";return "false";}
      if(!writable.test(key)){lastError="403";return "false";}
      values[key]=String(value);
      if(key.indexOf("cmi.interactions.")===0) values["cmi.interactions._count"]=dynamicCount("cmi.interactions");
      if(key.indexOf("cmi.objectives.")===0) values["cmi.objectives._count"]=dynamicCount("cmi.objectives");
      lastError="0";return "true";
    },
    LMSCommit:function(){ if(!initialized){lastError="301";return "false";} send(false); lastError="0"; return "true"; },
    LMSGetLastError:function(){return lastError;},
    LMSGetErrorString:function(code){return ({"0":"No error","101":"General exception","301":"Not initialized","401":"Not implemented error","403":"Data model element is read only"}[String(code)]||"Unknown error");},
    LMSGetDiagnostic:function(code){return this.LMSGetErrorString(code||lastError);}
  };
})();
</script>""".replace("__SEED__", seed).replace("__PACKAGE__", package_json).replace("__ATTEMPT__", attempt_json)


@router.get("/packages/{package_id}/{asset_path:path}")
def get_scorm_package_asset(package_id: str, asset_path: str, request: Request):
    """Serve an authenticated launch-relative asset through a short-lived ticket."""
    try:
        parsed_id = str(uuid.UUID(package_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="SCORM package not found.")
    if asset_path in {"launch", "launch-ticket", "content"} or asset_path.startswith("attempts/"):
        raise HTTPException(status_code=404, detail="SCORM asset not found.")
    ticket_data = _ticket_row(request.cookies.get(TICKET_COOKIE), parsed_id)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT storage_path FROM scorm_packages WHERE id = %s AND company_id = %s",
                (parsed_id, int(ticket_data[1])),
            )
            package = cur.fetchone()
    if not package:
        raise HTTPException(status_code=404, detail="SCORM package not found.")
    root = Path(package[0]).resolve()
    relative = PurePosixPath(asset_path.replace("\\", "/"))
    if relative.is_absolute() or any(part in {"..", ""} for part in relative.parts):
        raise HTTPException(status_code=400, detail="Invalid asset path.")
    target = (root / relative).resolve()
    if not target.is_relative_to(root) or not target.is_file():
        raise HTTPException(status_code=404, detail="SCORM asset not found.")
    suffix = target.suffix.lower()
    media_type = {
        ".html": "text/html", ".htm": "text/html", ".js": "application/javascript",
        ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
    }.get(suffix)
    headers = {"X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=60"}
    if suffix in {".html", ".htm"}:
        if target.stat().st_size > MAX_HTML_INJECTION_BYTES:
            raise HTTPException(status_code=413, detail="SCORM HTML document exceeds the injection size limit.")
        origin = _content_origin(request)
        headers["Content-Security-Policy"] = (
            f"default-src {origin} data: blob:; "
            f"img-src {origin} data: blob:; "
            f"media-src {origin} data: blob:; "
            f"font-src {origin} data: blob:; "
            f"style-src {origin} 'unsafe-inline' data:; "
            f"script-src {origin} 'unsafe-inline' 'unsafe-eval' data: blob:; "
            f"connect-src {origin} data: blob:; "
            f"frame-src {origin} data: blob:; "
            f"object-src 'none'; base-uri 'none'; form-action {origin}; "
            "sandbox allow-scripts allow-forms allow-downloads allow-modals allow-popups;"
        )
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT a.cmi_data, a.total_time, u.employee_id, u.name, p.mastery_score
                    FROM scorm_attempts a
                    JOIN users u ON u.id = a.user_id
                    JOIN scorm_packages p ON p.id = a.package_id
                    WHERE a.id = %s AND a.user_id = %s AND a.company_id = %s
                """, (str(ticket_data[3]) if ticket_data[3] else None, int(ticket_data[0]), int(ticket_data[1])))
                attempt_row = cur.fetchone()
        initial_cmi = dict(attempt_row[0] or {}) if attempt_row else {}
        if attempt_row:
            initial_cmi["cmi.core.total_time"] = attempt_row[1] or "0000:00:00.00"
            initial_cmi["cmi.core.student_id"] = str(attempt_row[2] or ticket_data[0])
            initial_cmi["cmi.core.student_name"] = str(attempt_row[3] or "")
            initial_cmi["cmi.core.student_data.mastery_score"] = str(attempt_row[4]) if attempt_row[4] is not None else ""
        has_resume_data = bool(initial_cmi.get("cmi.suspend_data") or initial_cmi.get("cmi.core.lesson_location") or initial_cmi.get("cmi.core.lesson_status") == "incomplete")
        initial_cmi["cmi.core.entry"] = "resume" if has_resume_data else "ab-initio"
        initial_cmi["cmi.core.session_time"] = "0000:00:00.00"
        runtime = _scorm_runtime_script(parsed_id, str(ticket_data[3]) if ticket_data[3] else "", initial_cmi)
        html = target.read_text(encoding="utf-8", errors="replace")
        lower_html = html.lower()
        insert_at = lower_html.find("</head>")
        if insert_at >= 0:
            html = html[:insert_at] + runtime + html[insert_at:]
        else:
            html = runtime + html
        return HTMLResponse(html, headers=headers)
    if suffix == ".js" and PurePosixPath(asset_path).name.lower() == "scormdriver.js":
        driver_source = target.read_text(encoding="utf-8", errors="replace")
        driver_source, replacements = re.subn(
            r"function SCORM_GetAPI\(\)\s*\{[\s\S]*?^\}",
            "function SCORM_GetAPI()\n{\n    return window.API || null;\n}",
            driver_source,
            count=1,
            flags=re.MULTILINE,
        )
        if replacements != 1:
            raise HTTPException(status_code=500, detail="The package SCORM 1.2 driver could not be safely adapted.")
        return Response(content=driver_source, media_type="application/javascript", headers=headers)
    return FileResponse(target, media_type=media_type, headers=headers)



@router.get("/courses/{course_id}/reports")
def scorm_course_reports(
    course_id: int,
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(get_current_user),
):
    role = current_user.get("role")
    if role not in {"super_admin", "company_admin", "department_head"}:
        raise HTTPException(status_code=403, detail="Permission denied.")
    course = _get_course_for_role(course_id, current_user)
    company_id = int(course[5]) if role == "super_admin" else _company_id(current_user)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT p.id, p.title, a.id, a.user_id, u.name, u.email,
                       a.attempt_number, a.completion_status, a.success_status,
                       a.score_raw, p.mastery_score, a.total_time, a.started_at,
                       a.last_accessed_at, a.completed_at
                FROM scorm_attempts a
                JOIN scorm_packages p ON p.id = a.package_id
                JOIN users u ON u.id = a.user_id
                WHERE p.course_id = %s AND a.company_id = %s
            """
            params = [course_id, company_id]
            if role == "department_head":
                query += " AND u.department_id = %s"
                params.append(int(current_user["department_id"]))
            query += " ORDER BY a.last_accessed_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
    return [{
        "package_id": str(r[0]), "package_title": r[1], "attempt_id": str(r[2]),
        "user_id": r[3], "learner_name": r[4], "learner_email": r[5],
        "attempt_number": r[6], "completion_status": r[7], "success_status": r[8],
        "score": float(r[9]) if r[9] is not None else None,
        "mastery_score": float(r[10]) if r[10] is not None else None,
        "total_time": r[11],
        "started_at": r[12].isoformat() if r[12] else None,
        "last_accessed_at": r[13].isoformat() if r[13] else None,
        "completed_at": r[14].isoformat() if r[14] else None,
    } for r in rows]


@router.delete("/packages/{package_id}")
def delete_scorm_package(package_id: str, current_user=Depends(get_current_user)):
    if current_user.get("role") not in {"company_admin", "department_head"}:
        raise HTTPException(status_code=403, detail="Only company admins and department heads can delete SCORM packages.")
    package = _package_row(package_id, current_user)
    storage_path = Path(package[7]).resolve()
    if not storage_path.is_relative_to(STORAGE_ROOT):
        raise HTTPException(status_code=500, detail="SCORM storage path is outside the configured storage root.")
    company_id = _company_id(current_user)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM scorm_packages WHERE id = %s AND company_id = %s RETURNING id",
                (str(package[0]), company_id),
            )
            deleted = cur.fetchone()
    if not deleted:
        raise HTTPException(status_code=404, detail="SCORM package not found.")
    shutil.rmtree(storage_path, ignore_errors=True)
    return {"success": True, "package_id": str(package[0])}
