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
# COMPANY REGISTRATION METADATA MIGRATION
# ============================================================

def ensure_company_registration_columns():
    columns = {
        "industry_type": "TEXT DEFAULT ''",
        "company_type": "TEXT",
        "gst_number": "TEXT",
        "cin_number": "TEXT",
        "company_description": "TEXT",
        "contact_person_name": "TEXT DEFAULT ''",
        "contact_designation": "TEXT DEFAULT ''",
        "contact_email": "TEXT DEFAULT ''",
        "contact_mobile": "TEXT DEFAULT ''",
        "address_line_1": "TEXT DEFAULT ''",
        "address_line_2": "TEXT",
        "city": "TEXT DEFAULT ''",
        "state": "TEXT DEFAULT ''",
        "country": "TEXT DEFAULT ''",
        "pin_code": "TEXT DEFAULT ''",
        "plan_name": "TEXT DEFAULT ''",
        "license_type": "TEXT DEFAULT ''",
        "subscription_start_date": "DATE",
        "subscription_expiry_date": "DATE",
        "trial": "BOOLEAN NOT NULL DEFAULT FALSE",
        "max_active_users": "INTEGER NOT NULL DEFAULT 1",
        "max_courses": "INTEGER",
        "storage_limit": "TEXT",
        "billing_cycle": "TEXT",
    }
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            for column_name, definition in columns.items():
                cursor.execute(
                    """
                    ALTER TABLE companies
                    ADD COLUMN IF NOT EXISTS {} {}
                    """.format(column_name, definition)
                )


ensure_company_registration_columns()


def create_company_registration(data, admin_password_hash):
    """Create the company and its first Company Admin atomically."""
    company_name = data["company_name"].strip()
    admin_email = data["admin_email"].strip().lower()

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM companies WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(%s)) LIMIT 1",
                (company_name,),
            )
            if cursor.fetchone():
                raise ValueError('Company "{}" already exists.'.format(company_name))

            cursor.execute(
                "SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(%s)) LIMIT 1",
                (admin_email,),
            )
            if cursor.fetchone():
                raise ValueError("A user with this Company Admin email already exists.")

            company_address = ", ".join(
                value.strip() for value in (
                    data["address_line_1"],
                    data.get("address_line_2") or "",
                    data["city"],
                    data["state"],
                    data["country"],
                    data["pin_code"],
                ) if value and value.strip()
            )
            cursor.execute(
                """
                INSERT INTO companies (
                    company_name, company_email, company_phone, company_address,
                    status, created_at, logo_url, logo_public_id,
                    primary_color, secondary_color, accent_color,
                    industry_type, company_type, gst_number, cin_number,
                    company_description, contact_person_name, contact_designation,
                    contact_email, contact_mobile, address_line_1, address_line_2,
                    city, state, country, pin_code, plan_name, license_type,
                    subscription_start_date, subscription_expiry_date, trial,
                    max_active_users, max_courses, storage_limit, billing_cycle
                )
                VALUES (
                    %s, %s, %s, %s, 'active', %s, '', '',
                    '#FBBF24', '#0F172A', '#F59E0B',
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
                """,
                (
                    company_name, data["contact_email"].strip().lower(),
                    data["contact_mobile"].strip(), company_address, datetime.now(),
                    data["industry_type"].strip(), data.get("company_type") or None,
                    data.get("gst_number") or None, data.get("cin_number") or None,
                    data.get("company_description") or None,
                    data["contact_person_name"].strip(), data["contact_designation"].strip(),
                    data["contact_email"].strip().lower(), data["contact_mobile"].strip(),
                    data["address_line_1"].strip(), data.get("address_line_2") or None,
                    data["city"].strip(), data["state"].strip(), data["country"].strip(),
                    data["pin_code"].strip(), data["plan_name"].strip(),
                    data["license_type"].strip(), data["start_date"], data["expiry_date"],
                    bool(data.get("trial", False)), data["max_active_users"],
                    data.get("max_courses"), data.get("storage_limit") or None,
                    data.get("billing_cycle") or None,
                ),
            )
            company_id = cursor.fetchone()[0]

            cursor.execute(
                """
                INSERT INTO users (
                    name, email, password_hash, role, company_id, department_id,
                    created_at, employee_id, department_head_id, mobile_number, designation
                )
                VALUES (%s, %s, %s, 'company_admin', %s, NULL, %s, NULL, NULL, %s, %s)
                RETURNING id
                """,
                (
                    data["admin_name"].strip(), admin_email, admin_password_hash,
                    company_id, datetime.now(), (data.get("admin_mobile") or "").strip() or None,
                    data["contact_designation"].strip(),
                ),
            )
            admin_id = cursor.fetchone()[0]

            return company_id, admin_id


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
                SELECT id
                FROM companies
                WHERE LOWER(TRIM(company_name))
                      = LOWER(TRIM(%s))
                LIMIT 1
                """,
                (company_name,),
            )

            existing_company = cursor.fetchone()

            if existing_company:
                raise ValueError(
                    f'Company "{company_name}" already exists.'
                )

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
                SELECT
                    c.*,
                    (
                        SELECT COUNT(*)
                        FROM users u
                        WHERE u.company_id = c.id
                          AND LOWER(COALESCE(u.role, ''))
                              = 'employee'
                    ) AS employee_count
                FROM companies c
                ORDER BY c.id DESC
                """
            )

            return cursor.fetchall()


# ============================================================
# GET COMPANY COUNT
# ============================================================

def get_company_count():

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT COUNT(*)
                FROM companies
                """
            )

            return cursor.fetchone()[0] or 0


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