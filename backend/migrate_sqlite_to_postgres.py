import os
import sqlite3
import sys

import psycopg2
from dotenv import load_dotenv


# Load backend/.env
load_dotenv()


SQLITE_DB = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "files.db",
)

DATABASE_URL = os.getenv("DATABASE_URL")


if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is missing. "
        "Add your Neon PostgreSQL connection string to backend/.env"
    )


def get_sqlite_tables(sqlite_conn):
    cursor = sqlite_conn.cursor()

    cursor.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    """)

    return [row[0] for row in cursor.fetchall()]


def get_sqlite_columns(sqlite_conn, table_name):
    cursor = sqlite_conn.cursor()

    cursor.execute(
        f'PRAGMA table_info("{table_name}")'
    )

    return cursor.fetchall()


def sqlite_type_to_postgres(sqlite_type):
    type_upper = (sqlite_type or "").upper()

    if "INT" in type_upper:
        return "INTEGER"

    if any(
        value in type_upper
        for value in ["CHAR", "CLOB", "TEXT"]
    ):
        return "TEXT"

    if "REAL" in type_upper:
        return "DOUBLE PRECISION"

    if "FLOA" in type_upper:
        return "DOUBLE PRECISION"

    if "DOUB" in type_upper:
        return "DOUBLE PRECISION"

    if "BOOL" in type_upper:
        return "BOOLEAN"

    if "BLOB" in type_upper:
        return "BYTEA"

    return "TEXT"


def create_postgres_table(
    postgres_cursor,
    sqlite_columns,
    table_name,
):
    column_definitions = []

    for column in sqlite_columns:
        cid, name, sqlite_type, not_null, default_value, pk = column

        postgres_type = sqlite_type_to_postgres(sqlite_type)

        # Preserve SQLite INTEGER PRIMARY KEY behavior.
        if pk == 1 and postgres_type == "INTEGER":
            definition = f'"{name}" INTEGER PRIMARY KEY'
        else:
            definition = f'"{name}" {postgres_type}'

            if not_null:
                definition += " NOT NULL"

            if default_value is not None:
                # SQLite defaults are not always valid PostgreSQL expressions.
                # Preserve common literal defaults only.
                default_text = str(default_value)

                if (
                    default_text.upper() == "NULL"
                    or default_text.startswith("(")
                ):
                    pass
                elif default_text.upper() in {
                    "CURRENT_TIMESTAMP",
                    "CURRENT_DATE",
                    "CURRENT_TIME",
                }:
                    definition += f" DEFAULT {default_text}"

        column_definitions.append(definition)

    create_sql = f'''
        CREATE TABLE IF NOT EXISTS "{table_name}" (
            {", ".join(column_definitions)}
        )
    '''

    postgres_cursor.execute(create_sql)


def copy_table_data(
    sqlite_conn,
    postgres_cursor,
    table_name,
    columns,
):
    column_names = [column[1] for column in columns]

    quoted_columns = ", ".join(
        f'"{name}"'
        for name in column_names
    )

    sqlite_cursor = sqlite_conn.cursor()

    sqlite_cursor.execute(
        f'SELECT {quoted_columns} FROM "{table_name}"'
    )

    rows = sqlite_cursor.fetchall()

    if not rows:
        print(f"  {table_name}: 0 rows")
        return 0

    placeholders = ", ".join(
        ["%s"] * len(column_names)
    )

    insert_sql = f'''
        INSERT INTO "{table_name}"
        ({quoted_columns})
        VALUES ({placeholders})
        ON CONFLICT DO NOTHING
    '''

    postgres_cursor.executemany(
        insert_sql,
        rows,
    )

    print(f"  {table_name}: {len(rows)} rows")

    return len(rows)


def main():
    print("=" * 60)
    print("SQLite → PostgreSQL migration")
    print("=" * 60)

    if not os.path.exists(SQLITE_DB):
        raise FileNotFoundError(
            f"SQLite database not found: {SQLITE_DB}"
        )

    print(f"\nSQLite database:")
    print(SQLITE_DB)

    sqlite_conn = sqlite3.connect(SQLITE_DB)

    postgres_conn = None

    try:
        print("\nConnecting to PostgreSQL...")

        postgres_conn = psycopg2.connect(
            DATABASE_URL
        )

        postgres_cursor = postgres_conn.cursor()

        print("PostgreSQL connection successful.\n")

        tables = get_sqlite_tables(sqlite_conn)

        print("SQLite tables found:")

        for table in tables:
            print(f"  - {table}")

        print(f"\nTotal tables: {len(tables)}")

        print("\nCreating PostgreSQL tables...")

        for table_name in tables:
            columns = get_sqlite_columns(
                sqlite_conn,
                table_name,
            )

            create_postgres_table(
                postgres_cursor,
                columns,
                table_name,
            )

        postgres_conn.commit()

        print("PostgreSQL tables created.\n")

        print("Migrating data...")

        total_rows = 0

        for table_name in tables:
            columns = get_sqlite_columns(
                sqlite_conn,
                table_name,
            )

            total_rows += copy_table_data(
                sqlite_conn,
                postgres_cursor,
                table_name,
                columns,
            )

        postgres_conn.commit()

        print("\n" + "=" * 60)
        print("Migration completed")
        print("=" * 60)
        print(f"Tables migrated: {len(tables)}")
        print(f"Rows processed:   {total_rows}")

    except Exception:
        if postgres_conn:
            postgres_conn.rollback()

        print("\nMigration FAILED.")

        raise

    finally:
        sqlite_conn.close()

        if postgres_conn:
            postgres_conn.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nERROR: {exc}")
        sys.exit(1)