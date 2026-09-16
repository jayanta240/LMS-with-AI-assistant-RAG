from datetime import datetime

from services.postgres_db import get_db_connection


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def init_db():
    """
    Ensure the core PostgreSQL tables used by this module exist.

    Existing migrated data is preserved.
    """

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            # ========================================================
            # COMPANIES
            # ========================================================

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS companies (
                    id INTEGER PRIMARY KEY,
                    company_name TEXT NOT NULL,
                    company_email TEXT,
                    company_phone TEXT,
                    company_address TEXT,
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMP,
                    logo_url TEXT DEFAULT '',
                    logo_public_id TEXT DEFAULT '',
                    primary_color TEXT DEFAULT '#FBBF24',
                    secondary_color TEXT DEFAULT '#0F172A',
                    accent_color TEXT DEFAULT '#F59E0B'
                )
            """)

            # ========================================================
            # DEPARTMENTS
            # ========================================================

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS departments (
                    id INTEGER PRIMARY KEY,
                    company_id INTEGER,
                    department_name TEXT,
                    department_head INTEGER,
                    created_at TIMESTAMP
                )
            """)

            # ========================================================
            # USERS
            # ========================================================

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY,
                    name TEXT,
                    email TEXT UNIQUE,
                    password_hash TEXT,
                    role TEXT,
                    company_id INTEGER,
                    department_id INTEGER,
                    created_at TIMESTAMP
                )
            """)

            # ========================================================
            # ENROLLMENTS
            # ========================================================

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS enrollments (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    course_id INTEGER,
                    assigned_at TIMESTAMP
                )
            """)

            # ========================================================
            # UPLOADED FILES
            # ========================================================

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS uploaded_files (
                    id INTEGER PRIMARY KEY,
                    filename TEXT,
                    filetype TEXT,
                    cloudinary_url TEXT,
                    size_mb DOUBLE PRECISION,
                    uploaded_at TIMESTAMP,
                    company_id INTEGER
                )
            """)
            cursor.execute("""
                ALTER TABLE uploaded_files
                ADD COLUMN IF NOT EXISTS company_id INTEGER
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_uploaded_files_company_id
                ON uploaded_files(company_id)
            """)

            # ========================================================
            # ISSUE IMAGES
            # ========================================================

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS issue_images (
                    id INTEGER PRIMARY KEY,
                    image_url TEXT,
                    public_id TEXT,
                    problem TEXT,
                    solution TEXT,
                    created_at TIMESTAMP
                )
            """)


# ============================================================
# FILE MANAGEMENT
# ============================================================

def add_file(
    filename,
    filetype,
    cloudinary_url,
    size_mb,
    company_id=None
):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                INSERT INTO uploaded_files
                (
                    filename,
                    filetype,
                    cloudinary_url,
                    size_mb,
                    uploaded_at,
                    company_id
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                filename,
                filetype,
                cloudinary_url,
                size_mb,
                datetime.now(),
                company_id,
            ))

            return cursor.fetchone()[0]

def get_all_files():

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT *
                FROM uploaded_files
                ORDER BY id DESC
            """)

            return cursor.fetchall()

def get_file_count(company_id=None):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            if company_id is not None:

                cursor.execute("""
                    SELECT COUNT(*)
                    FROM uploaded_files
                    WHERE company_id = %s
                """, (company_id,))

            else:

                cursor.execute("""
                    SELECT COUNT(*)
                    FROM uploaded_files
                """)

            return cursor.fetchone()[0] or 0

        
def delete_file(file_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                DELETE FROM uploaded_files
                WHERE id = %s
            """, (
                file_id,
            ))

            return cursor.rowcount > 0


# ============================================================
# ISSUE IMAGE KNOWLEDGE BASE
# ============================================================

def add_issue(
    image_url,
    public_id,
    problem,
    solution
):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                INSERT INTO issue_images
                (
                    image_url,
                    public_id,
                    problem,
                    solution,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (
                image_url,
                public_id,
                problem,
                solution,
                datetime.now(),
            ))

            return cursor.fetchone()[0]


def get_all_issues():

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT *
                FROM issue_images
                ORDER BY id DESC
            """)

            return cursor.fetchall()


def delete_issue(issue_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                DELETE FROM issue_images
                WHERE id = %s
            """, (
                issue_id,
            ))

            return cursor.rowcount > 0


# ============================================================
# UPDATE COURSE
# ============================================================

def update_course(
    course_id,
    title,
    description,
    thumbnail_url
):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

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

            return cursor.rowcount > 0


# ============================================================
# DELETE COURSE
# ============================================================

def delete_course(course_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                DELETE FROM courses
                WHERE id = %s
            """, (
                course_id,
            ))

            return cursor.rowcount > 0