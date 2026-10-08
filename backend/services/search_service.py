from services.postgres_db import get_db_connection


def search_platform(query: str, current_user: dict):
    """
    Search only data the authenticated user is allowed to discover.
    """
    q = (query or "").strip()

    if len(q) < 2:
        return []

    pattern = f"%{q}%"
    role = current_user.get("role")
    user_id = current_user.get("user_id")
    company_id = current_user.get("company_id")
    department_id = current_user.get("department_id")

    results = []

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            if role == "super_admin":
                cursor.execute(
                    """
                    SELECT id, company_name
                    FROM companies
                    WHERE company_name ILIKE %s
                    ORDER BY company_name
                    LIMIT 8
                    """,
                    (pattern,),
                )

                for row in cursor.fetchall():
                    results.append({
                        "type": "company",
                        "id": row[0],
                        "title": row[1],
                        "subtitle": "Company",
                        "href": "/dashboard/companies",
                    })

                cursor.execute(
                    """
                    SELECT id, department_name
                    FROM departments
                    WHERE department_name ILIKE %s
                    ORDER BY department_name
                    LIMIT 8
                    """,
                    (pattern,),
                )

                for row in cursor.fetchall():
                    results.append({
                        "type": "department",
                        "id": row[0],
                        "title": row[1],
                        "subtitle": "Department",
                        "href": "/dashboard/departments",
                    })

                cursor.execute(
                    """
                    SELECT id, title, description
                    FROM courses
                    WHERE
                        title ILIKE %s
                        OR COALESCE(description, '') ILIKE %s
                    ORDER BY id DESC
                    LIMIT 8
                    """,
                    (pattern, pattern),
                )

                for row in cursor.fetchall():
                    results.append({
                        "type": "course",
                        "id": row[0],
                        "title": row[1],
                        "subtitle": "Course",
                        "href": "/dashboard/courses/" + str(row[0]),
                    })

                cursor.execute(
                    """
                    SELECT id, filename, filetype
                    FROM uploaded_files
                    WHERE filename ILIKE %s
                    ORDER BY id DESC
                    LIMIT 8
                    """,
                    (pattern,),
                )

                for row in cursor.fetchall():
                    results.append({
                        "type": "file",
                        "id": row[0],
                        "title": row[1],
                        "subtitle": "Document • " + (row[2] or "file"),
                        "href": "/dashboard/files",
                    })

                cursor.execute(
                    """
                    SELECT
                        u.id,
                        u.name,
                        u.email,
                        u.role,
                        c.company_name
                    FROM users u
                    LEFT JOIN companies c
                      ON c.id = u.company_id
                    WHERE
                        u.name ILIKE %s
                        OR u.email ILIKE %s
                    ORDER BY u.id DESC
                    LIMIT 8
                    """,
                    (pattern, pattern),
                )

                for row in cursor.fetchall():
                    results.append({
                        "type": "user",
                        "id": row[0],
                        "title": row[1] or row[2],
                        "subtitle": f"{row[3].replace('_', ' ').title()} • {row[4] or 'No company'}",
                        "href": (
                            "/dashboard/company-admins"
                            if row[3] == "company_admin"
                            else "/dashboard/employees"
                        ),
                    })

            elif role in {"company_admin", "department_head"} and company_id is not None:
                if role == "company_admin":
                    cursor.execute(
                        """
                        SELECT id, name, email, role
                        FROM users
                        WHERE company_id = %s
                          AND role IN ('employee', 'department_head')
                          AND (
                              name ILIKE %s
                              OR email ILIKE %s
                          )
                        ORDER BY id DESC
                        LIMIT 8
                        """,
                        (company_id, pattern, pattern),
                    )
                else:
                    cursor.execute(
                        """
                        SELECT id, name, email, role
                        FROM users
                        WHERE company_id = %s
                          AND department_id = %s
                          AND role = 'employee'
                          AND (
                              name ILIKE %s
                              OR email ILIKE %s
                          )
                        ORDER BY id DESC
                        LIMIT 8
                        """,
                        (company_id, department_id, pattern, pattern),
                    )

                for row in cursor.fetchall():
                    results.append({
                        "type": "user",
                        "id": row[0],
                        "title": row[1] or row[2],
                        "subtitle": row[3].replace("_", " ").title(),
                        "href": "/dashboard/employees",
                    })

                if role == "company_admin":
                    cursor.execute(
                        """
                        SELECT id, department_name
                        FROM departments
                        WHERE company_id = %s
                          AND department_name ILIKE %s
                        ORDER BY department_name
                        LIMIT 8
                        """,
                        (company_id, pattern),
                    )

                    for row in cursor.fetchall():
                        results.append({
                            "type": "department",
                            "id": row[0],
                            "title": row[1],
                            "subtitle": "Department",
                            "href": "/dashboard/departments",
                        })

                cursor.execute(
                    """
                    SELECT id, title, description
                    FROM courses
                    WHERE company_id = %s
                      AND (
                          title ILIKE %s
                          OR COALESCE(description, '') ILIKE %s
                      )
                    ORDER BY id DESC
                    LIMIT 8
                    """,
                    (company_id, pattern, pattern),
                )

                for row in cursor.fetchall():
                    results.append({
                        "type": "course",
                        "id": row[0],
                        "title": row[1],
                        "subtitle": "Course",
                        "href": f"/dashboard/courses/{row[0]}",
                    })

                cursor.execute(
                    """
                    SELECT id, filename, filetype
                    FROM uploaded_files
                    WHERE company_id = %s
                      AND filename ILIKE %s
                    ORDER BY id DESC
                    LIMIT 8
                    """,
                    (company_id, pattern),
                )

                for row in cursor.fetchall():
                    results.append({
                        "type": "file",
                        "id": row[0],
                        "title": row[1],
                        "subtitle": f"Document • {row[2] or 'file'}",
                        "href": "/dashboard/files",
                    })

            elif role == "employee" and user_id is not None:
                cursor.execute(
                    """
                    SELECT DISTINCT c.id, c.title, c.description
                    FROM enrollments e
                    JOIN courses c
                      ON c.id = e.course_id
                    WHERE e.user_id = %s
                      AND (
                          c.title ILIKE %s
                          OR COALESCE(c.description, '') ILIKE %s
                      )
                    ORDER BY c.id DESC
                    LIMIT 10
                    """,
                    (user_id, pattern, pattern),
                )

                for row in cursor.fetchall():
                    results.append({
                        "type": "course",
                        "id": row[0],
                        "title": row[1],
                        "subtitle": "My Course",
                        "href": f"/learning/{row[0]}",
                    })

                cursor.execute(
                    """
                    SELECT DISTINCT
                        l.id,
                        l.title,
                        c.id,
                        c.title
                    FROM enrollments e
                    JOIN lessons l
                      ON l.course_id = e.course_id
                    JOIN courses c
                      ON c.id = l.course_id
                    WHERE e.user_id = %s
                      AND l.title ILIKE %s
                    ORDER BY l.id DESC
                    LIMIT 10
                    """,
                    (user_id, pattern),
                )

                for row in cursor.fetchall():
                    results.append({
                        "type": "lesson",
                        "id": row[0],
                        "title": row[1],
                        "subtitle": f"Lesson • {row[3]}",
                        "href": f"/learning/{row[2]}",
                    })

    return results[:20]
