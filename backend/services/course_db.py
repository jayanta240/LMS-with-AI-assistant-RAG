from datetime import datetime
from uuid import uuid4
import json

from services.postgres_db import get_db_connection


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def init_course_db():
    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            # ========================================================
            # COURSES
            # ========================================================
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS courses (
                    id SERIAL PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    thumbnail_url TEXT DEFAULT '',
                    created_at TIMESTAMP NOT NULL,
                    company_id INTEGER NOT NULL,
                    category TEXT,
                    sub_category TEXT,
                    level TEXT,
                    course_code TEXT,
                    language TEXT,
                    duration TEXT,
                    course_type TEXT NOT NULL DEFAULT 'online',
                    visibility TEXT NOT NULL DEFAULT 'private',
                    tags TEXT NOT NULL DEFAULT '[]',
                    learning_outcomes TEXT NOT NULL DEFAULT '[]',
                    release_date TEXT,
                    expiry_date TEXT,
                    status TEXT NOT NULL DEFAULT 'published',
                    department_id INTEGER
                )
            """)

            # Backward-compatible course-builder metadata migration.
            for column, definition in [
                ("category", "TEXT"),
                ("sub_category", "TEXT"),
                ("level", "TEXT"),
                ("course_code", "TEXT"),
                ("language", "TEXT"),
                ("duration", "TEXT"),
                ("course_type", "TEXT NOT NULL DEFAULT 'online'"),
                ("visibility", "TEXT NOT NULL DEFAULT 'private'"),
                ("tags", "TEXT NOT NULL DEFAULT '[]'"),
                ("learning_outcomes", "TEXT NOT NULL DEFAULT '[]'"),
                ("release_date", "TEXT"),
                ("expiry_date", "TEXT"),
                ("status", "TEXT NOT NULL DEFAULT 'published'"),
                ("department_id", "INTEGER"),
            ]:
                cursor.execute(
                    f"ALTER TABLE courses ADD COLUMN IF NOT EXISTS {column} {definition}"
                )

            # Existing database protection
            # The Neon migration has already added this column.
            cursor.execute("""
                ALTER TABLE courses
                ADD COLUMN IF NOT EXISTS company_id INTEGER
            """)

            # Make company_id mandatory.
            # The table is currently empty after our reset.
            cursor.execute("""
                SELECT COUNT(*)
                FROM courses
                WHERE company_id IS NULL
            """)

            null_company_courses = cursor.fetchone()[0]

            if null_company_courses == 0:
                cursor.execute("""
                    ALTER TABLE courses
                    ALTER COLUMN company_id SET NOT NULL
                """)

            # Add foreign key only if it does not already exist.
            cursor.execute("""
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'courses_company_id_fkey'
                  AND conrelid = 'courses'::regclass
            """)

            fk_exists = cursor.fetchone()

            if not fk_exists:
                cursor.execute("""
                    ALTER TABLE courses
                    ADD CONSTRAINT courses_company_id_fkey
                    FOREIGN KEY (company_id)
                    REFERENCES companies(id)
                    ON DELETE CASCADE
                """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_courses_company_id
                ON courses(company_id)
            """)

            # Department-level visibility for company-admin courses.
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS course_department_visibility (
                    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
                    PRIMARY KEY (course_id, department_id)
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_course_department_visibility_department
                ON course_department_visibility(department_id, course_id)
            """)

            # A course may require one or more earlier courses to be completed.
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS course_prerequisites (
                    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                    prerequisite_course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                    PRIMARY KEY (course_id, prerequisite_course_id),
                    CHECK (course_id <> prerequisite_course_id)
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_course_prerequisites_prerequisite
                ON course_prerequisites(prerequisite_course_id, course_id)
            """)

            # ========================================================
            # LESSONS
            # ========================================================
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS lessons (
                    id SERIAL PRIMARY KEY,
                    course_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    content_type TEXT NOT NULL,
                    content_url TEXT,
                    lesson_order INTEGER NOT NULL,
                    created_at TIMESTAMP NOT NULL
                )
            """)

            # ========================================================
            # LESSON PROGRESS
            # ========================================================
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS lesson_progress (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    course_id INTEGER NOT NULL,
                    lesson_id INTEGER NOT NULL,
                    completed INTEGER DEFAULT 0,
                    completed_at TIMESTAMP
                )
            """)

            # ========================================================
            # CERTIFICATES
            # ========================================================
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS certificates (
                    id SERIAL PRIMARY KEY,
                    certificate_number TEXT NOT NULL UNIQUE,
                    certificate_uuid TEXT NOT NULL UNIQUE,
                    user_id INTEGER NOT NULL,
                    course_id INTEGER NOT NULL,
                    company_id INTEGER NOT NULL,
                    user_name TEXT NOT NULL,
                    course_title TEXT NOT NULL,
                    company_name TEXT NOT NULL,
                    logo_url TEXT,
                    primary_color TEXT,
                    secondary_color TEXT,
                    accent_color TEXT,
                    issued_at TIMESTAMP NOT NULL,
                    pdf_url TEXT,
                    status TEXT DEFAULT 'issued',
                    UNIQUE(user_id, course_id)
                )
            """)

            # Certificate expiry migration. Existing certificates are deliberately
            # left without an expiry date to preserve their current validity.
            cursor.execute("""
                ALTER TABLE certificates
                ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS company_certificate_settings (
                    company_id INTEGER PRIMARY KEY,
                    validity_days INTEGER NULL CHECK (validity_days IS NULL OR validity_days > 0),
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)


def get_company_certificate_settings(company_id):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT validity_days, updated_at
                FROM company_certificate_settings
                WHERE company_id = %s
            """, (company_id,))
            row = cursor.fetchone()
    return {
        "company_id": company_id,
        "validity_days": row[0] if row else None,
        "no_expiry": row is None or row[0] is None,
        "updated_at": row[1] if row else None,
    }


def update_company_certificate_settings(company_id, validity_days):
    if validity_days is not None and (not isinstance(validity_days, int) or validity_days <= 0):
        raise ValueError("validity_days must be a positive integer or null for no expiry.")
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO company_certificate_settings (company_id, validity_days, updated_at)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (company_id) DO UPDATE
                SET validity_days = EXCLUDED.validity_days,
                    updated_at = CURRENT_TIMESTAMP
            """, (company_id, validity_days))
    return get_company_certificate_settings(company_id)


# ============================================================
# COURSES
# ============================================================

def create_course(
    company_id,
    title,
    description,
    thumbnail_url="",
    category=None,
    sub_category=None,
    level=None,
    course_code=None,
    language=None,
    duration=None,
    course_type="online",
    visibility="private",
    tags=None,
    learning_outcomes=None,
    release_date=None,
    expiry_date=None,
    status="draft",
    department_id=None,
    visible_department_ids=None,
    prerequisite_course_ids=None,
):
    """
    Create a course belonging to exactly one company.
    """

    if not company_id:
        raise ValueError("company_id is required")

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            # Confirm company exists.
            cursor.execute("""
                SELECT id
                FROM companies
                WHERE id = %s
            """, (company_id,))

            company = cursor.fetchone()

            if not company:
                raise ValueError("Company not found")

            cursor.execute("""
                INSERT INTO courses (
                    company_id, title, description, thumbnail_url, created_at,
                    category, sub_category, level, course_code, language, duration,
                    course_type, visibility, tags, learning_outcomes,
                    release_date, expiry_date, status, department_id
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
            """, (
                company_id, title, description, thumbnail_url, datetime.now(),
                category, sub_category, level, course_code, language, duration,
                course_type, visibility,
                json.dumps(tags or []), json.dumps(learning_outcomes or []),
                release_date, expiry_date, status, department_id,
            ))

            row = cursor.fetchone()
            course_id = row[0]

            # Store explicit Department Head visibility separately from
            # the legacy department_id ownership field.
            for visible_department_id in sorted(set(visible_department_ids or [])):
                cursor.execute("""
                    INSERT INTO course_department_visibility (course_id, department_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """, (course_id, visible_department_id))

            prerequisite_ids = sorted(set(prerequisite_course_ids or []))
            if prerequisite_ids:
                cursor.execute("""
                    SELECT id
                    FROM courses
                    WHERE company_id = %s
                      AND id = ANY(%s)
                """, (company_id, prerequisite_ids))
                valid_prerequisite_ids = {row[0] for row in cursor.fetchall()}
                if valid_prerequisite_ids != set(prerequisite_ids):
                    raise ValueError("Prerequisite courses must belong to the same company.")
                if course_id in prerequisite_ids:
                    raise ValueError("A course cannot be its own prerequisite.")
                for prerequisite_id in prerequisite_ids:
                    cursor.execute("""
                        INSERT INTO course_prerequisites (course_id, prerequisite_course_id)
                        VALUES (%s, %s)
                    """, (course_id, prerequisite_id))

            return course_id


def get_course_prerequisite_status(user_id, course_id):
    """Return prerequisite courses and whether this learner completed each one."""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT prerequisite.id, prerequisite.title
                FROM course_prerequisites cp
                JOIN courses prerequisite ON prerequisite.id = cp.prerequisite_course_id
                WHERE cp.course_id = %s
                ORDER BY prerequisite.title
            """, (course_id,))
            rows = cursor.fetchall()

    status = []
    for prerequisite_id, title in rows:
        completed = False
        if user_id is not None:
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT
                            (SELECT COUNT(*) FROM lessons WHERE course_id = %s)
                            + (SELECT COUNT(*) FROM scorm_packages WHERE course_id = %s),
                            (SELECT COUNT(DISTINCT lesson_id)
                             FROM lesson_progress
                             WHERE user_id = %s AND course_id = %s AND completed = 1)
                            + (SELECT COUNT(DISTINCT a.package_id)
                               FROM scorm_attempts a
                               JOIN scorm_packages p ON p.id = a.package_id
                               WHERE a.user_id = %s
                                 AND p.course_id = %s
                                 AND a.completion_status IN ('completed', 'passed')
                                 AND a.success_status <> 'failed')
                    """, (
                        prerequisite_id, prerequisite_id,
                        user_id, prerequisite_id,
                        user_id, prerequisite_id,
                    ))
                    progress_row = cursor.fetchone()
            total_required = int(progress_row[0] or 0)
            total_completed = int(progress_row[1] or 0)
            completed = total_required > 0 and total_completed >= total_required
        status.append({
            "course_id": prerequisite_id,
            "title": title,
            "completed": completed,
        })
    return status


def get_missing_course_prerequisites(user_id, course_id):
    """Return prerequisites that the learner has not completed yet."""
    return [
        item for item in get_course_prerequisite_status(user_id, course_id)
        if not item["completed"]
    ]


def get_course_department_visibility(course_id):
    """Return department IDs explicitly granted access to a course."""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT department_id
                FROM course_department_visibility
                WHERE course_id = %s
                ORDER BY department_id
            """, (course_id,))
            return [row[0] for row in cursor.fetchall()]


def set_course_department_visibility(course_id, department_ids):
    """Replace the explicitly shared departments for a course."""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "DELETE FROM course_department_visibility WHERE course_id = %s",
                (course_id,),
            )
            for department_id in sorted(set(department_ids or [])):
                cursor.execute("""
                    INSERT INTO course_department_visibility (course_id, department_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """, (course_id, department_id))


def get_all_courses():
    """
    Global course list.
    Intended for super-admin/internal use.
    """

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    title,
                    description,
                    thumbnail_url,
                    created_at,
                    company_id,
                    category,
                    sub_category,
                    level,
                    course_code,
                    language,
                    duration,
                    course_type,
                    visibility,
                    tags,
                    learning_outcomes,
                    release_date,
                    expiry_date,
                    status,
                    department_id
                FROM courses
                ORDER BY id DESC
            """)

            return cursor.fetchall()


def get_courses(company_id=None, department_id=None):
    """Return courses, optionally scoped to a company and department."""
    select_sql = """
        SELECT id, title, description, thumbnail_url, created_at, company_id,
               category, sub_category, level, course_code, language, duration,
               course_type, visibility, tags, learning_outcomes, release_date,
               expiry_date, status, department_id
        FROM courses
    """
    conditions = []
    params = []
    if company_id is not None:
        conditions.append("company_id = %s")
        params.append(company_id)
    if department_id is not None:
        conditions.append("""(
            department_id = %s OR EXISTS (
                SELECT 1 FROM course_department_visibility cdv
                WHERE cdv.course_id = courses.id
                  AND cdv.department_id = %s
            )
        )""")
        params.extend([department_id, department_id])
    if conditions:
        select_sql += " WHERE " + " AND ".join(conditions)
    select_sql += " ORDER BY id DESC"

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(select_sql, tuple(params))
            return cursor.fetchall()


def get_course(course_id, company_id=None, department_id=None):
    """Fetch one course, enforcing any supplied company/department scope."""
    query = """
        SELECT id, title, description, thumbnail_url, created_at, company_id,
               category, sub_category, level, course_code, language, duration,
               course_type, visibility, tags, learning_outcomes, release_date,
               expiry_date, status, department_id
        FROM courses
        WHERE id = %s
    """
    params = [course_id]
    if company_id is not None:
        query += " AND company_id = %s"
        params.append(company_id)
    if department_id is not None:
        query += """ AND (
            department_id = %s OR EXISTS (
                SELECT 1 FROM course_department_visibility cdv
                WHERE cdv.course_id = courses.id
                  AND cdv.department_id = %s
            )
        )"""
        params.extend([department_id, department_id])

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, tuple(params))
            return cursor.fetchone()


def update_course(
    course_id,
    title,
    description,
    thumbnail_url,
    company_id=None
):
    """
    Update a course.

    If company_id is supplied, only that company's course
    can be updated.
    """

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            if company_id is None:

                cursor.execute("""
                    UPDATE courses
                    SET
                        title = %s,
                        description = %s,
                        thumbnail_url = %s
                    WHERE id = %s
                """, (
                    title,
                    description,
                    thumbnail_url,
                    course_id,
                ))

            else:

                cursor.execute("""
                    UPDATE courses
                    SET
                        title = %s,
                        description = %s,
                        thumbnail_url = %s
                    WHERE id = %s
                      AND company_id = %s
                """, (
                    title,
                    description,
                    thumbnail_url,
                    course_id,
                    company_id,
                ))

            return cursor.rowcount > 0


def delete_course(
    course_id,
    company_id=None
):
    """
    Delete a course.

    Company-scoped deletion is enforced when company_id
    is provided.
    """

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            if company_id is None:

                cursor.execute("""
                    DELETE FROM courses
                    WHERE id = %s
                """, (course_id,))

            else:

                cursor.execute("""
                    DELETE FROM courses
                    WHERE id = %s
                      AND company_id = %s
                """, (
                    course_id,
                    company_id,
                ))

            return cursor.rowcount > 0


# ============================================================
# LESSONS
# ============================================================

def create_lesson(
    course_id,
    title,
    content_type,
    content_url,
    lesson_order,
    company_id=None
):
    """
    Create a lesson only for an existing course.

    company_id can be supplied to verify ownership.
    """

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            if company_id is None:

                cursor.execute("""
                    SELECT id
                    FROM courses
                    WHERE id = %s
                """, (course_id,))

            else:

                cursor.execute("""
                    SELECT id
                    FROM courses
                    WHERE id = %s
                      AND company_id = %s
                """, (
                    course_id,
                    company_id,
                ))

            course = cursor.fetchone()

            if not course:
                raise ValueError("Course not found or not accessible")

            cursor.execute("""
                INSERT INTO lessons (
                    course_id,
                    title,
                    content_type,
                    content_url,
                    lesson_order,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                course_id,
                title,
                content_type,
                content_url,
                lesson_order,
                datetime.now(),
            ))

            return cursor.fetchone()[0]


def delete_lessons_by_content_url(
    company_id,
    content_url
):
    """
    Remove every lesson in a company that references
    the deleted uploaded file URL.
    """
    if not company_id or not content_url:
        return 0

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT l.id
                FROM lessons l
                JOIN courses c
                    ON c.id = l.course_id
                WHERE c.company_id = %s
                  AND l.content_url = %s
            """, (
                company_id,
                content_url,
            ))

            lesson_rows = cursor.fetchall()

            if lesson_rows:
                lesson_ids = [
                    row[0]
                    for row in lesson_rows
                ]

                cursor.execute("""
                    DELETE FROM lesson_progress
                    WHERE lesson_id = ANY(%s)
                """, (
                    lesson_ids,
                ))

                cursor.execute("""
                    DELETE FROM lessons l
                    USING courses c
                    WHERE l.course_id = c.id
                      AND c.company_id = %s
                      AND l.content_url = %s
                """, (
                    company_id,
                    content_url,
                ))

            return len(lesson_rows)


def get_lessons(
    course_id,
    company_id=None
):
    """
    Return lessons for a company-owned course.
    """

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            if company_id is None:

                cursor.execute("""
                    SELECT
                        id,
                        course_id,
                        title,
                        content_type,
                        content_url,
                        lesson_order,
                        created_at
                    FROM lessons
                    WHERE course_id = %s
                    ORDER BY lesson_order ASC
                """, (course_id,))

            else:

                cursor.execute("""
                    SELECT
                        l.id,
                        l.course_id,
                        l.title,
                        l.content_type,
                        l.content_url,
                        l.lesson_order,
                        l.created_at
                    FROM lessons l
                    JOIN courses c
                        ON c.id = l.course_id
                    WHERE l.course_id = %s
                      AND c.company_id = %s
                    ORDER BY l.lesson_order ASC
                """, (
                    course_id,
                    company_id,
                ))

            return cursor.fetchall()


# ============================================================
# DASHBOARD STATS
# ============================================================

def get_dashboard_stats(company_id=None):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            if company_id is None:

                cursor.execute("""
                    SELECT COUNT(*)
                    FROM courses
                """)

            else:

                cursor.execute("""
                    SELECT COUNT(*)
                    FROM courses
                    WHERE company_id = %s
                """, (company_id,))

            courses = cursor.fetchone()[0]

            if company_id is None:

                cursor.execute("""
                    SELECT COUNT(*)
                    FROM lessons
                """)

            else:

                cursor.execute("""
                    SELECT COUNT(*)
                    FROM lessons l
                    JOIN courses c
                        ON c.id = l.course_id
                    WHERE c.company_id = %s
                """, (company_id,))

            lessons = cursor.fetchone()[0]

            return {
                "courses": courses,
                "lessons": lessons,
            }


def get_course_stats(company_id=None):

    return get_dashboard_stats(company_id)


# ============================================================
# MARK LESSON COMPLETE
# ============================================================

def mark_lesson_complete(
    user_id,
    course_id,
    lesson_id
):

    now = datetime.now()

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            # --------------------------------------------------------
            # Verify lesson belongs to course
            # --------------------------------------------------------

            cursor.execute("""
                SELECT id
                FROM lessons
                WHERE id = %s
                  AND course_id = %s
            """, (
                lesson_id,
                course_id,
            ))

            lesson = cursor.fetchone()

            if not lesson:
                raise ValueError(
                    "Lesson does not belong to this course"
                )

            # --------------------------------------------------------
            # Verify employee is enrolled in course
            # --------------------------------------------------------

            cursor.execute("""
                SELECT 1
                FROM enrollments
                WHERE user_id = %s
                  AND course_id = %s
                LIMIT 1
            """, (
                user_id,
                course_id,
            ))

            enrollment = cursor.fetchone()

            if not enrollment:
                raise PermissionError(
                    "User is not enrolled in this course"
                )

            # --------------------------------------------------------
            # Check existing progress record
            # --------------------------------------------------------

            cursor.execute("""
                SELECT id
                FROM lesson_progress
                WHERE user_id = %s
                  AND course_id = %s
                  AND lesson_id = %s
            """, (
                user_id,
                course_id,
                lesson_id,
            ))

            row = cursor.fetchone()

            # --------------------------------------------------------
            # Update existing record
            # --------------------------------------------------------

            if row:

                cursor.execute("""
                    UPDATE lesson_progress
                    SET
                        completed = 1,
                        completed_at = %s
                    WHERE id = %s
                """, (
                    now,
                    row[0],
                ))

            # --------------------------------------------------------
            # Create new record
            # --------------------------------------------------------

            else:

                cursor.execute("""
                    INSERT INTO lesson_progress (
                        user_id,
                        course_id,
                        lesson_id,
                        completed,
                        completed_at
                    )
                    VALUES (%s, %s, %s, 1, %s)
                """, (
                    user_id,
                    course_id,
                    lesson_id,
                    now,
                ))

    return True


# ============================================================
# COURSE PROGRESS
# ============================================================

def get_course_progress(
    user_id,
    course_id
):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            # --------------------------------------------------------
            # Verify enrollment
            # --------------------------------------------------------

            cursor.execute("""
                SELECT 1
                FROM enrollments
                WHERE user_id = %s
                  AND course_id = %s
                LIMIT 1
            """, (
                user_id,
                course_id,
            ))

            enrollment = cursor.fetchone()

            if not enrollment:
                return {
                    "completed": 0,
                    "total": 0,
                    "percentage": 0,
                }

            # --------------------------------------------------------
            # Completed lessons
            # --------------------------------------------------------

            cursor.execute("""
                SELECT COUNT(*)
                FROM lesson_progress
                WHERE user_id = %s
                  AND course_id = %s
                  AND completed = 1
            """, (
                user_id,
                course_id,
            ))

            completed = cursor.fetchone()[0]

            # Completed SCORM activities count toward overall course progress.
            cursor.execute("""
                SELECT COUNT(DISTINCT a.package_id)
                FROM scorm_attempts a
                JOIN scorm_packages p ON p.id = a.package_id
                WHERE a.user_id = %s
                  AND p.course_id = %s
                  AND a.completion_status IN ('completed', 'passed', 'failed')
            """, (user_id, course_id))
            completed += cursor.fetchone()[0]

            # --------------------------------------------------------
            # Total lessons and SCORM activities
            # --------------------------------------------------------

            cursor.execute("""
                SELECT
                    (SELECT COUNT(*) FROM lessons WHERE course_id = %s)
                    + (SELECT COUNT(*) FROM scorm_packages WHERE course_id = %s)
            """, (
                course_id,
                course_id,
            ))

            total = cursor.fetchone()[0]

    percentage = 0

    if total > 0:
        percentage = int(
            (completed / total) * 100
        )

    return {
        "completed": completed,
        "total": total,
        "percentage": percentage,
    }


# ============================================================
# CHECK COURSE COMPLETION
# ============================================================

def is_course_completed(
    user_id,
    course_id
):

    progress = get_course_progress(
        user_id,
        course_id,
    )

    # Course with zero lessons should
    # not automatically earn certificate.

    if progress["total"] <= 0:
        return False

    return (
        progress["completed"]
        >= progress["total"]
    )


# ============================================================
# CREATE CERTIFICATE
# ============================================================

def create_certificate(
    user_id,
    course_id,
    company_id,
    user_name,
    course_title,
    company_name,
    logo_url="",
    primary_color="#FBBF24",
    secondary_color="#0F172A",
    accent_color="#F59E0B",
    pdf_url=""
):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            # --------------------------------------------------------
            # Verify course belongs to company
            # --------------------------------------------------------

            cursor.execute("""
                SELECT id
                FROM courses
                WHERE id = %s
                  AND company_id = %s
            """, (
                course_id,
                company_id,
            ))

            course = cursor.fetchone()

            if not course:
                raise ValueError(
                    "Course does not belong to this company"
                )

            # --------------------------------------------------------
            # Verify user enrollment
            # --------------------------------------------------------

            cursor.execute("""
                SELECT 1
                FROM enrollments
                WHERE user_id = %s
                  AND course_id = %s
                LIMIT 1
            """, (
                user_id,
                course_id,
            ))

            enrollment = cursor.fetchone()

            if not enrollment:
                raise PermissionError(
                    "User is not enrolled in this course"
                )

            # --------------------------------------------------------
            # Check whether certificate already exists
            # --------------------------------------------------------

            cursor.execute("""
                SELECT
                    id,
                    certificate_number,
                    certificate_uuid,
                    pdf_url,
                    issued_at
                FROM certificates
                WHERE user_id = %s
                  AND course_id = %s
            """, (
                user_id,
                course_id,
            ))

            existing = cursor.fetchone()

            if existing:

                return {
                    "id": existing[0],
                    "certificate_number": existing[1],
                    "certificate_uuid": existing[2],
                    "pdf_url": existing[3],
                    "issued_at": existing[4],
                    "already_exists": True,
                }

            # --------------------------------------------------------
            # Generate certificate identifiers
            # --------------------------------------------------------

            certificate_uuid = str(uuid4())

            certificate_number = (
                f"CERT-"
                f"{company_id}-"
                f"{datetime.now().strftime('%Y')}-"
                f"{uuid4().hex[:8].upper()}"
            )

            issued_at = datetime.now()
            cursor.execute("""
                SELECT validity_days
                FROM company_certificate_settings
                WHERE company_id = %s
            """, (company_id,))
            validity_row = cursor.fetchone()
            validity_days = validity_row[0] if validity_row else None
            expires_at = (
                issued_at + __import__("datetime").timedelta(days=validity_days)
                if validity_days else None
            )

            # --------------------------------------------------------
            # Insert certificate
            # --------------------------------------------------------

            cursor.execute("""
                INSERT INTO certificates (
                    certificate_number,
                    certificate_uuid,
                    user_id,
                    course_id,
                    company_id,
                    user_name,
                    course_title,
                    company_name,
                    logo_url,
                    primary_color,
                    secondary_color,
                    accent_color,
                    issued_at,
                    pdf_url,
                    status,
                    expires_at
                )
                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s
                )
                RETURNING id
            """, (
                certificate_number,
                certificate_uuid,
                user_id,
                course_id,
                company_id,
                user_name,
                course_title,
                company_name,
                logo_url,
                primary_color,
                secondary_color,
                accent_color,
                issued_at,
                pdf_url,
                "issued",
                expires_at,
            ))

            certificate_id = cursor.fetchone()[0]

            return {
                "id": certificate_id,
                "certificate_number": certificate_number,
                "certificate_uuid": certificate_uuid,
                "pdf_url": pdf_url,
                "issued_at": issued_at,
                "expires_at": expires_at,
                "already_exists": False,
            }


# ============================================================
# UPDATE CERTIFICATE PDF URL
# ============================================================

def update_certificate_pdf_url(
    certificate_id,
    pdf_url
):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                UPDATE certificates
                SET pdf_url = %s
                WHERE id = %s
            """, (
                pdf_url,
                certificate_id,
            ))

            return cursor.rowcount > 0


# ============================================================
# GET USER CERTIFICATES
# ============================================================

def get_user_certificates(user_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    certificate_number,
                    certificate_uuid,
                    user_id,
                    course_id,
                    company_id,
                    user_name,
                    course_title,
                    company_name,
                    logo_url,
                    primary_color,
                    secondary_color,
                    accent_color,
                    issued_at,
                    pdf_url,
                    status,
                    expires_at
                FROM certificates
                WHERE user_id = %s
                ORDER BY issued_at DESC
            """, (
                user_id,
            ))

            rows = cursor.fetchall()

    certificates = []

    for row in rows:

        certificates.append({
            "id": row[0],
            "certificate_number": row[1],
            "certificate_uuid": row[2],
            "user_id": row[3],
            "course_id": row[4],
            "company_id": row[5],
            "user_name": row[6],
            "course_title": row[7],
            "company_name": row[8],
            "logo_url": row[9],
            "primary_color": row[10],
            "secondary_color": row[11],
            "accent_color": row[12],
            "issued_at": row[13],
            "pdf_url": row[14],
            "status": row[15],
            "expires_at": row[16],
            "expiry_status": (
                "no_expiry" if row[16] is None else
                "expired" if row[16].date() < datetime.now().date() else
                "expiring_soon" if (row[16].date() - datetime.now().date()).days <= 30 else
                "active"
            ),
        })

    return certificates


# ============================================================
# GET SINGLE CERTIFICATE
# ============================================================

def get_certificate(certificate_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    certificate_number,
                    certificate_uuid,
                    user_id,
                    course_id,
                    company_id,
                    user_name,
                    course_title,
                    company_name,
                    logo_url,
                    primary_color,
                    secondary_color,
                    accent_color,
                    issued_at,
                    pdf_url,
                    status,
                    expires_at
                FROM certificates
                WHERE id = %s
            """, (
                certificate_id,
            ))

            row = cursor.fetchone()

    if not row:
        return None

    return {
        "id": row[0],
        "certificate_number": row[1],
        "certificate_uuid": row[2],
        "user_id": row[3],
        "course_id": row[4],
        "company_id": row[5],
        "user_name": row[6],
        "course_title": row[7],
        "company_name": row[8],
        "logo_url": row[9],
        "primary_color": row[10],
        "secondary_color": row[11],
        "accent_color": row[12],
        "issued_at": row[13],
        "pdf_url": row[14],
        "status": row[15],
        "expires_at": row[16],
        "expiry_status": (
            "no_expiry" if row[16] is None else
            "expired" if row[16].date() < datetime.now().date() else
            "expiring_soon" if (row[16].date() - datetime.now().date()).days <= 30 else
            "active"
        ),
    }


# ============================================================
# GET COMPANY CERTIFICATES
# ============================================================

def get_company_certificates(company_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    certificate_number,
                    certificate_uuid,
                    user_id,
                    course_id,
                    company_id,
                    user_name,
                    course_title,
                    company_name,
                    logo_url,
                    primary_color,
                    secondary_color,
                    accent_color,
                    issued_at,
                    pdf_url,
                    status,
                    expires_at
                FROM certificates
                WHERE company_id = %s
                ORDER BY issued_at DESC
            """, (
                company_id,
            ))

            rows = cursor.fetchall()

    certificates = []

    for row in rows:

        certificates.append({
            "id": row[0],
            "certificate_number": row[1],
            "certificate_uuid": row[2],
            "user_id": row[3],
            "course_id": row[4],
            "company_id": row[5],
            "user_name": row[6],
            "course_title": row[7],
            "company_name": row[8],
            "logo_url": row[9],
            "primary_color": row[10],
            "secondary_color": row[11],
            "accent_color": row[12],
            "issued_at": row[13],
            "pdf_url": row[14],
            "status": row[15],
            "expires_at": row[16],
            "expiry_status": (
                "no_expiry" if row[16] is None else
                "expired" if row[16].date() < datetime.now().date() else
                "expiring_soon" if (row[16].date() - datetime.now().date()).days <= 30 else
                "active"
            ),
        })

    return certificates


# ============================================================
# COMPLETED LESSON IDS
# ============================================================

def get_completed_lessons(
    user_id,
    course_id=None
):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            if course_id is None:

                cursor.execute("""
                    SELECT lesson_id
                    FROM lesson_progress
                    WHERE user_id = %s
                      AND completed = 1
                    ORDER BY lesson_id
                """, (
                    user_id,
                ))

            else:

                cursor.execute("""
                    SELECT lesson_id
                    FROM lesson_progress
                    WHERE user_id = %s
                      AND course_id = %s
                      AND completed = 1
                    ORDER BY lesson_id
                """, (
                    user_id,
                    course_id,
                ))

            rows = cursor.fetchall()

    return [
        row[0]
        for row in rows
    ]


# ============================================================
# ADMIN ANALYTICS
# ============================================================

def get_admin_analytics(company_id=None):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            if company_id is None:

                cursor.execute("""
                    SELECT
                        users.name,
                        courses.title,

                        (
                            SELECT COUNT(*)
                            FROM lessons
                            WHERE course_id = courses.id
                        ) AS total_lessons,

                        (
                            SELECT COUNT(*)
                            FROM lesson_progress lp
                            JOIN lessons l
                                ON lp.lesson_id = l.id
                            WHERE lp.user_id = users.id
                              AND l.course_id = courses.id
                              AND lp.completed = 1
                        ) AS completed_lessons

                    FROM enrollments

                    JOIN users
                        ON users.id = enrollments.user_id

                    JOIN courses
                        ON courses.id = enrollments.course_id

                    ORDER BY users.name, courses.title
                """)

            else:

                cursor.execute("""
                    SELECT
                        users.name,
                        courses.title,

                        (
                            SELECT COUNT(*)
                            FROM lessons
                            WHERE course_id = courses.id
                        ) AS total_lessons,

                        (
                            SELECT COUNT(*)
                            FROM lesson_progress lp
                            JOIN lessons l
                                ON lp.lesson_id = l.id
                            WHERE lp.user_id = users.id
                              AND l.course_id = courses.id
                              AND lp.completed = 1
                        ) AS completed_lessons

                    FROM enrollments

                    JOIN users
                        ON users.id = enrollments.user_id

                    JOIN courses
                        ON courses.id = enrollments.course_id

                    WHERE courses.company_id = %s

                    ORDER BY users.name, courses.title
                """, (
                    company_id,
                ))

            rows = cursor.fetchall()

    result = []

    for row in rows:

        total = row[2]
        completed = row[3]

        progress = 0

        if total > 0:
            progress = int(
                (completed / total) * 100
            )

        result.append({
            "employee": row[0],
            "course": row[1],
            "completed": completed,
            "total": total,
            "progress": progress,
        })

    return result