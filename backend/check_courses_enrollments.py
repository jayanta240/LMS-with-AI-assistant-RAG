import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing from .env")


def main():
    connection = None

    try:
        connection = psycopg2.connect(DATABASE_URL)

        with connection.cursor() as cursor:

            # ====================================================
            # COURSES
            # ====================================================

            print("\n================ COURSES ================\n")

            cursor.execute("""
                SELECT
                    id,
                    title,
                    description,
                    created_at
                FROM courses
                ORDER BY id
            """)

            courses = cursor.fetchall()

            if not courses:
                print("No courses found.")
            else:
                for row in courses:
                    print(
                        f"Course ID   : {row[0]}\n"
                        f"Title       : {row[1]}\n"
                        f"Description : {row[2]}\n"
                        f"Created At  : {row[3]}\n"
                        f"{'-' * 60}"
                    )

            # ====================================================
            # ENROLLMENTS
            # ====================================================

            print("\n================ ENROLLMENTS ================\n")

            cursor.execute("""
                SELECT
                    e.id,
                    e.user_id,
                    u.name,
                    u.email,
                    u.company_id,
                    u.department_id,
                    e.course_id,
                    c.title,
                    e.assigned_at
                FROM enrollments e

                JOIN users u
                    ON u.id = e.user_id

                JOIN courses c
                    ON c.id = e.course_id

                ORDER BY
                    e.course_id,
                    e.user_id
            """)

            enrollments = cursor.fetchall()

            if not enrollments:
                print("No enrollments found.")
            else:
                for row in enrollments:
                    print(
                        f"Enrollment ID : {row[0]}\n"
                        f"User ID       : {row[1]}\n"
                        f"User Name     : {row[2]}\n"
                        f"Email         : {row[3]}\n"
                        f"Company ID    : {row[4]}\n"
                        f"Department ID : {row[5]}\n"
                        f"Course ID     : {row[6]}\n"
                        f"Course Title  : {row[7]}\n"
                        f"Assigned At   : {row[8]}\n"
                        f"{'-' * 60}"
                    )

            # ====================================================
            # COURSE → COMPANY SUMMARY
            # ====================================================

            print("\n================ COURSE COMPANY SUMMARY ================\n")

            cursor.execute("""
                SELECT
                    c.id,
                    c.title,
                    COUNT(DISTINCT e.user_id) AS enrolled_users,
                    COUNT(DISTINCT u.company_id) AS companies
                FROM courses c

                LEFT JOIN enrollments e
                    ON e.course_id = c.id

                LEFT JOIN users u
                    ON u.id = e.user_id

                GROUP BY
                    c.id,
                    c.title

                ORDER BY c.id
            """)

            summary = cursor.fetchall()

            for row in summary:
                print(
                    f"Course ID       : {row[0]}\n"
                    f"Course Title    : {row[1]}\n"
                    f"Enrolled Users  : {row[2]}\n"
                    f"Companies Found : {row[3]}\n"
                    f"{'-' * 60}"
                )

        print("\n✅ Inspection completed successfully.")

    except Exception as exc:
        print("\n❌ Inspection failed")
        print(type(exc).__name__, exc)

    finally:
        if connection:
            connection.close()


if __name__ == "__main__":
    main()