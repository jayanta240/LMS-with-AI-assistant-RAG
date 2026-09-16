from datetime import datetime

from services.postgres_db import get_db_connection


# ============================================================
# BRANDING MIGRATION
# ============================================================

def ensure_branding_columns():
    """
    Ensure the branding columns exist in the PostgreSQL
    companies table.

    The initial SQLite -> PostgreSQL migration may already
    have copied these columns. This function is kept for
    backward compatibility and safe startup.
    """

    branding_columns = {
        "logo_url": "TEXT DEFAULT ''",
        "logo_public_id": "TEXT DEFAULT ''",
        "primary_color": "TEXT DEFAULT '#FBBF24'",
        "secondary_color": "TEXT DEFAULT '#0F172A'",
        "accent_color": "TEXT DEFAULT '#F59E0B'",
    }

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            for column_name, definition in branding_columns.items():

                cursor.execute(
                    """
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'companies'
                      AND column_name = %s
                    """,
                    (column_name,),
                )

                exists = cursor.fetchone()

                if not exists:
                    cursor.execute(
                        f"""
                        ALTER TABLE companies
                        ADD COLUMN {column_name} {definition}
                        """
                    )


# Run when the module is loaded.
ensure_branding_columns()


# ============================================================
# CREATE COMPANY
# ============================================================

def create_company(
    company_name,
    company_email,
    company_phone,
    company_address
):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO companies
                (
                    company_name,
                    company_email,
                    company_phone,
                    company_address,
                    status,
                    created_at,
                    logo_url,
                    logo_public_id,
                    primary_color,
                    secondary_color,
                    accent_color
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s
                )
                RETURNING id
                """,
                (
                    company_name,
                    company_email,
                    company_phone,
                    company_address,
                    "active",
                    datetime.now(),
                    "",
                    "",
                    "#FBBF24",
                    "#0F172A",
                    "#F59E0B",
                ),
            )

            return cursor.fetchone()[0]


# ============================================================
# GET COMPANIES
# ============================================================

def get_companies():

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT *
                FROM companies
                ORDER BY id DESC
                """
            )

            return cursor.fetchall()


# ============================================================
# GET COMPANY
# ============================================================

def get_company(company_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT *
                FROM companies
                WHERE id = %s
                """,
                (company_id,),
            )

            return cursor.fetchone()


# ============================================================
# UPDATE COMPANY
# ============================================================

def update_company(
    company_id,
    company_name,
    company_email,
    company_phone,
    company_address,
    status
):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                UPDATE companies
                SET
                    company_name = %s,
                    company_email = %s,
                    company_phone = %s,
                    company_address = %s,
                    status = %s
                WHERE id = %s
                """,
                (
                    company_name,
                    company_email,
                    company_phone,
                    company_address,
                    status,
                    company_id,
                ),
            )

            return cursor.rowcount > 0


# ============================================================
# DELETE COMPANY
# ============================================================

def delete_company(company_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                DELETE FROM companies
                WHERE id = %s
                """,
                (company_id,),
            )

            return cursor.rowcount > 0


# ============================================================
# BRANDING
# ============================================================

def get_company_branding(company_id):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    company_name,
                    logo_url,
                    logo_public_id,
                    primary_color,
                    secondary_color,
                    accent_color
                FROM companies
                WHERE id = %s
                """,
                (company_id,),
            )

            row = cursor.fetchone()

    if not row:
        return None

    return {
        "company_id": row[0],
        "company_name": row[1] or "",
        "logo_url": row[2] or "",
        "logo_public_id": row[3] or "",
        "primary_color": row[4] or "#FBBF24",
        "secondary_color": row[5] or "#0F172A",
        "accent_color": row[6] or "#F59E0B",
    }


def update_company_branding(
    company_id,
    logo_url=None,
    logo_public_id=None,
    primary_color=None,
    secondary_color=None,
    accent_color=None
):

    current = get_company_branding(company_id)

    if not current:
        raise ValueError(
            "Company not found."
        )

    final_logo_url = (
        logo_url
        if logo_url is not None
        else current["logo_url"]
    )

    final_logo_public_id = (
        logo_public_id
        if logo_public_id is not None
        else current["logo_public_id"]
    )

    final_primary_color = (
        primary_color
        if primary_color is not None
        else current["primary_color"]
    )

    final_secondary_color = (
        secondary_color
        if secondary_color is not None
        else current["secondary_color"]
    )

    final_accent_color = (
        accent_color
        if accent_color is not None
        else current["accent_color"]
    )

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                UPDATE companies
                SET
                    logo_url = %s,
                    logo_public_id = %s,
                    primary_color = %s,
                    secondary_color = %s,
                    accent_color = %s
                WHERE id = %s
                """,
                (
                    final_logo_url,
                    final_logo_public_id,
                    final_primary_color,
                    final_secondary_color,
                    final_accent_color,
                    company_id,
                ),
            )

    return get_company_branding(company_id)