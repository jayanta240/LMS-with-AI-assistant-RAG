import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing from .env")


TABLES = [
    "companies",
    "departments",
    "users",
    "enrollments",
    "courses",
    "lessons",
    "lesson_progress",
    "certificates",
    "uploaded_files",
    "issue_images",
]


def fix_table_id(cursor, table_name):
    print(f"\nProcessing: {table_name}")

    # Check whether the id column is an IDENTITY column
    cursor.execute(
        """
        SELECT is_identity
        FROM information_schema.columns
        WHERE table_name = %s
          AND column_name = 'id'
        """,
        (table_name,),
    )

    row = cursor.fetchone()

    if not row:
        print(f"⚠️ {table_name}: id column not found")
        return

    is_identity = row[0]

    if is_identity == "YES":
        print(
            f"✅ {table_name}: id is already an identity column. Skipping."
        )
        return

    sequence_name = f"{table_name}_id_seq"

    # Create sequence if needed
    cursor.execute(
        f"""
        CREATE SEQUENCE IF NOT EXISTS {sequence_name}
        """
    )

    # Current maximum ID
    cursor.execute(
        f"""
        SELECT COALESCE(MAX(id), 0)
        FROM {table_name}
        """
    )

    max_id = cursor.fetchone()[0]

    # Set sequence position
    if max_id > 0:
        cursor.execute(
            f"""
            SELECT setval(
                '{sequence_name}',
                {max_id},
                true
            )
            """
        )
    else:
        cursor.execute(
            f"""
            SELECT setval(
                '{sequence_name}',
                1,
                false
            )
            """
        )

    # Attach sequence as default only when the column is not identity
    cursor.execute(
        f"""
        ALTER TABLE {table_name}
        ALTER COLUMN id
        SET DEFAULT nextval('{sequence_name}')
        """
    )

    # Make the sequence owned by the id column
    cursor.execute(
        f"""
        ALTER SEQUENCE {sequence_name}
        OWNED BY {table_name}.id
        """
    )

    print(
        f"✅ {table_name}: max id = {max_id}, "
        f"next generated id = {max_id + 1}"
    )


def main():
    connection = None

    try:
        connection = psycopg2.connect(DATABASE_URL)

        with connection:
            with connection.cursor() as cursor:

                for table in TABLES:
                    fix_table_id(cursor, table)

        print("\n✅ PostgreSQL ID generation check completed.")

    except Exception as exc:
        print("\n❌ Failed to fix PostgreSQL IDs")
        print(type(exc).__name__, exc)

    finally:
        if connection:
            connection.close()


if __name__ == "__main__":
    main()