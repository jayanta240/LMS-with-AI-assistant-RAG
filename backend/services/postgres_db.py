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
# Neon can close idle SSL connections while the connection
# remains stored inside the local pool. Therefore every
# connection taken from the pool is health-checked before use.
#
# Starting conservatively:
#
#   Minimum connections: 1
#   Maximum connections: 5
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
# GET HEALTHY DATABASE CONNECTION
# ============================================================

def _get_healthy_connection():
    """
    Get a live connection from the pool.

    A pooled connection can look open locally even when the
    remote PostgreSQL server has already closed the socket.
    Run a lightweight SELECT 1 before returning it.

    Dead connections are discarded and replaced with a fresh
    connection.
    """

    for attempt in range(2):

        connection = None

        try:
            connection = db_pool.getconn()

            # Local psycopg2 closed-state check.
            if connection.closed:
                db_pool.putconn(
                    connection,
                    close=True,
                )
                connection = None
                continue

            # Remote health check.
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")

            # The health check starts/uses a transaction in
            # psycopg2. Return the connection in a clean state.
            connection.rollback()

            return connection

        except (psycopg2.Error, OSError):

            if connection is not None:
                try:
                    db_pool.putconn(
                        connection,
                        close=True,
                    )
                except Exception:
                    pass

            connection = None

            # Retry once with a completely fresh connection.
            if attempt == 0:
                continue

            raise


# ============================================================
# GET DATABASE CONNECTION
# ============================================================

@contextmanager
def get_db_connection():

    connection = None

    try:

        # Always acquire a verified live connection.
        connection = _get_healthy_connection()

        yield connection

        # Commit successful operation.
        if not connection.closed:
            connection.commit()

    except Exception:

        # Roll back only while the connection is still alive.
        # Calling rollback() on a dead connection causes a
        # secondary "connection already closed" exception.
        if connection is not None and not connection.closed:
            try:
                connection.rollback()
            except Exception:
                pass

        raise

    finally:

        if connection is not None:

            try:
                if connection.closed:
                    db_pool.putconn(
                        connection,
                        close=True,
                    )
                else:
                    db_pool.putconn(
                        connection
                    )
            except Exception:
                # If returning the connection fails, make sure a
                # broken connection does not remain in the pool.
                try:
                    db_pool.putconn(
                        connection,
                        close=True,
                    )
                except Exception:
                    pass


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
