import os
from contextlib import contextmanager

import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from dotenv import load_dotenv


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is missing. "
        "Add your Neon PostgreSQL connection string to backend/.env"
    )


# ============================================================
# CONNECTION POOL
# ============================================================
#
# Why a pool?
#
# The old implementation opened a completely new Neon
# connection for every database operation.
#
# The pool keeps a small number of reusable connections ready.
#
# This is especially important for a remote PostgreSQL database
# such as Neon.
#
# Starting conservatively:
#
#   Minimum connections: 1
#   Maximum connections: 5
#
# We can increase this later after measuring actual usage.
# ============================================================

DB_POOL_MIN = int(
    os.getenv("DB_POOL_MIN", "1")
)

DB_POOL_MAX = int(
    os.getenv("DB_POOL_MAX", "5")
)


db_pool = ThreadedConnectionPool(
    minconn=DB_POOL_MIN,
    maxconn=DB_POOL_MAX,
    dsn=DATABASE_URL,
)


# ============================================================
# GET DATABASE CONNECTION
# ============================================================

@contextmanager
def get_db_connection():

    connection = None

    try:

        # Get an existing connection from the pool
        connection = db_pool.getconn()

        yield connection

        # Commit successful operation
        connection.commit()

    except Exception:

        # Roll back failed operation
        if connection:
            connection.rollback()

        raise

    finally:

        # Return the connection to the pool
        if connection:
            db_pool.putconn(connection)


# ============================================================
# GET DATABASE CURSOR
# ============================================================

@contextmanager
def get_db_cursor():

    with get_db_connection() as connection:

        with connection.cursor() as cursor:

            yield cursor


# ============================================================
# CLOSE POOL
# ============================================================

def close_db_pool():

    global db_pool

    if db_pool:
        db_pool.closeall()