import json
import time
from datetime import datetime

from services.postgres_db import get_db_connection
from services.enrollment_db import get_user_course_ids


# ============================================================
# PERSISTENT AI CHAT HISTORY
# ============================================================

# Short-lived runtime cache for active chats.
# PostgreSQL remains the source of truth. The cache only avoids
# repeating remote DB reads for every message in the same chat.
_CHAT_CONTEXT_CACHE = {}
_CHAT_CONTEXT_CACHE_TTL = 30.0


def _cache_key(session_id, user_id, company_id):
    return (
        str(session_id),
        user_id,
        company_id,
    )


def _get_cached_context(session_id, user_id, company_id):
    key = _cache_key(
        session_id,
        user_id,
        company_id,
    )

    cached = _CHAT_CONTEXT_CACHE.get(key)

    if not cached:
        return None

    if cached["expires_at"] <= time.monotonic():
        _CHAT_CONTEXT_CACHE.pop(key, None)
        return None

    return {
        "session": dict(cached["session"]),
        "messages": [
            dict(message)
            for message in cached["messages"]
        ],
        "course_ids": list(cached["course_ids"]),
    }


def _store_cached_context(
    session,
    messages,
    course_ids,
):
    key = _cache_key(
        session["id"],
        session["user_id"],
        session["company_id"],
    )

    _CHAT_CONTEXT_CACHE[key] = {
        "session": dict(session),
        "messages": [
            dict(message)
            for message in messages[-6:]
        ],
        "course_ids": list(course_ids),
        "expires_at": (
            time.monotonic()
            + _CHAT_CONTEXT_CACHE_TTL
        ),
    }


def cache_chat_exchange(
    session_id,
    user_id,
    company_id,
    user_content,
    assistant_content,
    sources=None,
    video=None,
):
    """
    Update the in-process chat cache immediately after the model
    responds. Persistence to PostgreSQL can happen independently.
    """
    key = _cache_key(
        session_id,
        user_id,
        company_id,
    )

    cached = _CHAT_CONTEXT_CACHE.get(key)

    if not cached:
        return False

    cached["messages"].extend([
        {
            "role": "user",
            "content": user_content,
        },
        {
            "role": "assistant",
            "content": assistant_content,
        },
    ])

    cached["messages"] = cached["messages"][-6:]

    cached["session"]["last_message_at"] = datetime.now()

    if (
        cached["session"].get("name") == "New Chat"
        and user_content
    ):
        cached["session"]["name"] = (
            " ".join(user_content.split())[:60]
            or "New Chat"
        )

    cached["expires_at"] = (
        time.monotonic()
        + _CHAT_CONTEXT_CACHE_TTL
    )

    return True

def init_chat_db():
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                ALTER TABLE ai_sessions
                ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'New Chat'
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ai_messages (
                    id SERIAL PRIMARY KEY,
                    session_id TEXT NOT NULL
                        REFERENCES ai_sessions(session_id)
                        ON DELETE CASCADE,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
                    video TEXT,
                    created_at TIMESTAMP NOT NULL
                )
            """)

            cursor.execute("""
                ALTER TABLE ai_messages
                ADD COLUMN IF NOT EXISTS video TEXT
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_ai_messages_session
                ON ai_messages(session_id, id)
            """)


def _session_row_to_dict(row):
    if not row:
        return None

    return {
        "id": row[0],
        "user_id": row[1],
        "company_id": row[2],
        "name": row[3] or "New Chat",
        "started_at": row[4],
        "last_message_at": row[5],
    }


def create_chat_session(user_id, company_id, name="New Chat"):
    if user_id is None:
        raise ValueError("user_id is required")

    now = datetime.now()

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            import uuid

            session_id = str(uuid.uuid4())

            cursor.execute("""
                INSERT INTO ai_sessions (
                    session_id,
                    user_id,
                    company_id,
                    started_at,
                    last_message_at,
                    message_count,
                    name
                )
                VALUES (%s, %s, %s, %s, %s, 0, %s)
            """, (
                session_id,
                user_id,
                company_id,
                now,
                now,
                name or "New Chat",
            ))

    return {
        "id": session_id,
        "name": name or "New Chat",
    }


def list_chat_sessions(user_id, company_id):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    session_id,
                    user_id,
                    company_id,
                    name,
                    started_at,
                    last_message_at
                FROM ai_sessions
                WHERE user_id = %s
                  AND company_id IS NOT DISTINCT FROM %s
                ORDER BY COALESCE(last_message_at, started_at) DESC, session_id DESC
            """, (
                user_id,
                company_id,
            ))

            return [
                {
                    "id": row[0],
                    "name": row[3] or "New Chat",
                    "created_at": row[4],
                    "updated_at": row[5],
                }
                for row in cursor.fetchall()
            ]


def get_chat_session(session_id, user_id, company_id):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    session_id,
                    user_id,
                    company_id,
                    name,
                    started_at,
                    last_message_at
                FROM ai_sessions
                WHERE session_id = %s
                  AND user_id = %s
                  AND company_id IS NOT DISTINCT FROM %s
            """, (
                session_id,
                user_id,
                company_id,
            ))

            return _session_row_to_dict(cursor.fetchone())


def _read_messages(cursor, session_id):
    cursor.execute("""
        SELECT
            role,
            content,
            sources,
            video
        FROM ai_messages
        WHERE session_id = %s
        ORDER BY id ASC
    """, (session_id,))

    messages = []

    for role, content, sources, video in cursor.fetchall():
        parsed_sources = sources or []

        if isinstance(parsed_sources, str):
            try:
                parsed_sources = json.loads(parsed_sources)
            except Exception:
                parsed_sources = []

        item = {
            "role": role,
            "content": content,
            "sources": parsed_sources,
        }

        if video:
            item["video"] = video

        messages.append(item)

    return messages


def get_chat_messages(session_id, user_id, company_id):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    session_id,
                    user_id,
                    company_id,
                    name,
                    started_at,
                    last_message_at
                FROM ai_sessions
                WHERE session_id = %s
                  AND user_id = %s
                  AND company_id IS NOT DISTINCT FROM %s
            """, (
                session_id,
                user_id,
                company_id,
            ))

            if not cursor.fetchone():
                return None

            return _read_messages(cursor, session_id)


def get_chat_context(
    session_id,
    user_id,
    company_id,
    max_history=6,
):
    """
    Load the owned session and recent conversation. Active chats are
    served from a short-lived in-process cache, while PostgreSQL
    remains the durable source of truth.
    """
    cached = _get_cached_context(
        session_id,
        user_id,
        company_id,
    )

    if cached:
        return cached

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    session_id,
                    user_id,
                    company_id,
                    name,
                    started_at,
                    last_message_at
                FROM ai_sessions
                WHERE session_id = %s
                  AND user_id = %s
                  AND company_id IS NOT DISTINCT FROM %s
            """, (
                session_id,
                user_id,
                company_id,
            ))

            session_row = cursor.fetchone()

            if not session_row:
                return None

            cursor.execute("""
                SELECT
                    role,
                    content
                FROM ai_messages
                WHERE session_id = %s
                ORDER BY id DESC
                LIMIT %s
            """, (
                session_id,
                max_history,
            ))

            message_rows = list(
                reversed(cursor.fetchall())
            )

            messages = [
                {
                    "role": role,
                    "content": content,
                }
                for role, content in message_rows
            ]

    course_ids = get_user_course_ids(user_id)

    session = _session_row_to_dict(
        session_row
    )

    _store_cached_context(
        session,
        messages,
        course_ids,
    )

    return {
        "session": session,
        "messages": messages,
        "course_ids": course_ids,
    }


def _normalize_sources(sources):
    normalized_sources = []

    for source in sources or []:
        if hasattr(source, "model_dump"):
            normalized_sources.append(source.model_dump())
        elif isinstance(source, dict):
            normalized_sources.append(source)
        else:
            try:
                normalized_sources.append(dict(source))
            except Exception:
                continue

    return normalized_sources


def append_chat_exchange(
    session_id,
    user_id,
    company_id,
    user_content,
    assistant_content,
    sources=None,
    video=None,
):
    """
    Persist one complete chat exchange in a single transaction.
    This replaces multiple sequential DB round trips.
    """
    if not isinstance(user_content, str) or not user_content.strip():
        raise ValueError("User message content is required")

    if not isinstance(assistant_content, str) or not assistant_content.strip():
        raise ValueError("Assistant message content is required")

    normalized_sources = _normalize_sources(sources)
    now = datetime.now()

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT name
                FROM ai_sessions
                WHERE session_id = %s
                  AND user_id = %s
                  AND company_id IS NOT DISTINCT FROM %s
                FOR UPDATE
            """, (
                session_id,
                user_id,
                company_id,
            ))

            session_row = cursor.fetchone()

            if not session_row:
                return False

            cursor.execute("""
                INSERT INTO ai_messages (
                    session_id,
                    role,
                    content,
                    sources,
                    video,
                    created_at
                )
                VALUES (%s, 'user', %s, '[]'::jsonb, NULL, %s)
            """, (
                session_id,
                user_content,
                now,
            ))

            cursor.execute("""
                INSERT INTO ai_messages (
                    session_id,
                    role,
                    content,
                    sources,
                    video,
                    created_at
                )
                VALUES (%s, 'assistant', %s, %s::jsonb, %s, %s)
            """, (
                session_id,
                assistant_content,
                json.dumps(normalized_sources),
                video,
                now,
            ))

            cursor.execute("""
                UPDATE ai_sessions
                SET
                    last_message_at = %s,
                    message_count = message_count + 1,
                    name = CASE
                        WHEN name = 'New Chat'
                        THEN %s
                        ELSE name
                    END
                WHERE session_id = %s
                  AND user_id = %s
                  AND company_id IS NOT DISTINCT FROM %s
            """, (
                now,
                " ".join(user_content.split())[:60] or "New Chat",
                session_id,
                user_id,
                company_id,
            ))

    return True


def append_chat_message(
    session_id,
    user_id,
    company_id,
    role,
    content,
    sources=None,
    video=None,
):
    """
    Backward-compatible single-message persistence helper.
    """
    if role not in {"user", "assistant"}:
        raise ValueError("Invalid message role")

    normalized_sources = _normalize_sources(sources)
    now = datetime.now()

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT name
                FROM ai_sessions
                WHERE session_id = %s
                  AND user_id = %s
                  AND company_id IS NOT DISTINCT FROM %s
            """, (
                session_id,
                user_id,
                company_id,
            ))

            session_row = cursor.fetchone()

            if not session_row:
                return False

            cursor.execute("""
                INSERT INTO ai_messages (
                    session_id,
                    role,
                    content,
                    sources,
                    video,
                    created_at
                )
                VALUES (%s, %s, %s, %s::jsonb, %s, %s)
            """, (
                session_id,
                role,
                content,
                json.dumps(normalized_sources),
                video,
                now,
            ))

            cursor.execute("""
                UPDATE ai_sessions
                SET
                    last_message_at = %s,
                    message_count = CASE
                        WHEN %s = 'assistant'
                        THEN message_count
                        ELSE message_count + 1
                    END,
                    name = CASE
                        WHEN name = 'New Chat' AND %s = 'user'
                        THEN %s
                        ELSE name
                    END
                WHERE session_id = %s
                  AND user_id = %s
                  AND company_id IS NOT DISTINCT FROM %s
            """, (
                now,
                role,
                role,
                " ".join((content or "").split())[:60] or "New Chat",
                session_id,
                user_id,
                company_id,
            ))

    return True


def rename_chat_session(
    session_id,
    user_id,
    company_id,
    name,
):
    clean_name = (name or "").strip()

    if not clean_name:
        clean_name = "New Chat"

    clean_name = clean_name[:120]

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE ai_sessions
                SET name = %s
                WHERE session_id = %s
                  AND user_id = %s
                  AND company_id IS NOT DISTINCT FROM %s
            """, (
                clean_name,
                session_id,
                user_id,
                company_id,
            ))

            return cursor.rowcount > 0


def delete_chat_session(
    session_id,
    user_id,
    company_id,
):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                DELETE FROM ai_sessions
                WHERE session_id = %s
                  AND user_id = %s
                  AND company_id IS NOT DISTINCT FROM %s
            """, (
                session_id,
                user_id,
                company_id,
            ))

            return cursor.rowcount > 0
