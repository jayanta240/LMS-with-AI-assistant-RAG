import os
import time
import logging
from contextlib import contextmanager

import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from dotenv import load_dotenv


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()

_perf_logger = logging.getLogger("lms.performance")
_SLOW_DB_CHECKOUT_MS = float(os.getenv("LMS_PERF_DB_CHECKOUT_MS", "100"))
_SLOW_DB_LEASE_MS = float(os.getenv("LMS_PERF_DB_LEASE_MS", "500"))

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


# TCP keepalives help the operating system detect dead remote peers
# without an application-level SELECT 1 on every connection checkout.
db_pool = ThreadedConnectionPool(
    minconn=DB_POOL_MIN,
    maxconn=DB_POOL_MAX,
    dsn=DATABASE_URL,
    keepalives=1,
    keepalives_idle=int(os.getenv("DB_KEEPALIVES_IDLE", "30")),
    keepalives_interval=int(os.getenv("DB_KEEPALIVES_INTERVAL", "10")),
    keepalives_count=int(os.getenv("DB_KEEPALIVES_COUNT", "3")),
    connect_timeout=int(os.getenv("DB_CONNECT_TIMEOUT", "10")),
)


# ============================================================
# GET HEALTHY DATABASE CONNECTION
# ============================================================

def _get_healthy_connection():
    """
    Checkout a pooled connection without issuing a network round trip.

    The previous SELECT 1 on every checkout added a full Neon network
    round trip to every database operation. TCP keepalives help detect
    dead peers, and actual database operations will surface stale socket
    errors. Broken connections are discarded by get_db_connection().
    """
    for attempt in range(2):
        connection = None
        try:
            connection = db_pool.getconn()
            if connection.closed:
                db_pool.putconn(connection, close=True)
                connection = None
                continue
            return connection
        except (psycopg2.Error, OSError):
            if connection is not None:
                try:
                    db_pool.putconn(connection, close=True)
                except Exception:
                    pass
            if attempt == 0:
                continue
            raise


# ============================================================
# GET DATABASE CONNECTION
# ============================================================

@contextmanager
def get_db_connection():

    connection = None
    checkout_started = time.perf_counter()
    lease_started = None

    try:

        # Always acquire a verified live connection.
        connection = _get_healthy_connection()
        checkout_ms = (time.perf_counter() - checkout_started) * 1000
        lease_started = time.perf_counter()

        if checkout_ms >= _SLOW_DB_CHECKOUT_MS:
            _perf_logger.warning(
                "slow_db_checkout duration_ms=%.1f",
                checkout_ms,
            )

        yield connection

        # Commit successful operation.
        if not connection.closed:
            connection.commit()

    except Exception:

        # Only emit timings; never log SQL, credentials, or payloads.
        if lease_started is None:
            checkout_ms = (time.perf_counter() - checkout_started) * 1000
            if checkout_ms >= _SLOW_DB_CHECKOUT_MS:
                _perf_logger.warning(
                    "slow_db_checkout_failed duration_ms=%.1f",
                    checkout_ms,
                )

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

        if lease_started is not None:
            lease_ms = (time.perf_counter() - lease_started) * 1000
            if lease_ms >= _SLOW_DB_LEASE_MS:
                _perf_logger.warning(
                    "long_db_connection_lease duration_ms=%.1f",
                    lease_ms,
                )

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
