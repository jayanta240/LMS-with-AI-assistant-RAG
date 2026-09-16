from datetime import datetime

from services.postgres_db import get_db_connection


# ============================================================
# CREATE DEPARTMENT
# ============================================================

def create_department(
    company_id,
    department_name
):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                INSERT INTO departments
                (
                    company_id,
                    department_name,
                    created_at
                )
                VALUES (%s, %s, %s)
                RETURNING id
            """, (
                company_id,
                department_name,
                datetime.now(),
            ))

            return cursor.fetchone()[0]


# ============================================================
# GET DEPARTMENTS
# ============================================================

def get_departments(company_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT *
                FROM departments
                WHERE company_id = %s
                ORDER BY id DESC
            """, (
                company_id,
            ))

            return cursor.fetchall()


# ============================================================
# DELETE DEPARTMENT
# ============================================================

def delete_department(department_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                DELETE FROM departments
                WHERE id = %s
            """, (
                department_id,
            ))

            return cursor.rowcount > 0