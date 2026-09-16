import os

import psycopg2
from dotenv import load_dotenv


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing from .env")


TABLES = [
    "certificates",
    "companies",
    "courses",
    "departments",
    "enrollments",
    "issue_images",
    "lesson_progress",
    "lessons",
    "uploaded_files",
    "users",
]


def main():
    connection = None

    try:
        connection = psycopg2.connect(DATABASE_URL)

        with connection.cursor() as cursor:
            print("=" * 60)
            print("NEON POSTGRESQL DATA VERIFICATION")
            print("=" * 60)

            total = 0

            for table in TABLES:
                cursor.execute(
                    f'SELECT COUNT(*) FROM "{table}"'
                )

                count = cursor.fetchone()[0]
                total += count

                print(f"{table:<20} {count:>5} rows")

            print("-" * 60)
            print(f"{'TOTAL':<20} {total:>5} rows")
            print("=" * 60)

    except Exception as exc:
        print("Verification failed:")
        print(exc)

    finally:
        if connection:
            connection.close()


if __name__ == "__main__":
    main()