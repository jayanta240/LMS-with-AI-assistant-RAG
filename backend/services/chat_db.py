import json
from datetime import datetime

from services.postgres_db import get_db_connection


# ============================================================
# PERSISTENT AI CHAT HISTORY
# ============================================================

def init_chat_db():
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            # Reuse ai_sessions created by dashboard analytics.
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


def get_chat_messages(session_id, user_id, company_id, limit=None):
    session = get_chat_session(
        session_id,
        user_id,
        company_id,
    )

    if not session:
        return None

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            if limit is not None:
                cursor.execute("""
                    SELECT
                        role,
                        content,
                        sources,
                        video
                    FROM (
                        SELECT
                            id,
                            role,
                            content,
                            sources,
                            video
                        FROM ai_messages
                        WHERE session_id = %s
                        ORDER BY id DESC
                        LIMIT %s
                    ) recent_messages
                    ORDER BY id ASC
                """, (
                    session_id,
                    max(1, int(limit)),
                ))
            else:
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

            rows = cursor.fetchall()

    messages = []

    for role, content, sources, video in rows:
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


def append_chat_message(
    session_id,
    user_id,
    company_id,
    role,
    content,
    sources=None,
    video=None,
):
    session = get_chat_session(
        session_id,
        user_id,
        company_id,
    )

    if not session:
        return False

    if role not in {"user", "assistant"}:
        raise ValueError("Invalid chat message role")

    sources = sources or []

    normalized_sources = []

    for source in sources:
        if hasattr(source, "model_dump"):
            normalized_sources.append(source.model_dump())
        elif isinstance(source, dict):
            normalized_sources.append(source)
        else:
            try:
                normalized_sources.append(dict(source))
            except Exception:
                continue

    now = datetime.now()

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
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
                    last_message_at = %s
                WHERE session_id = %s
                  AND user_id = %s
                  AND company_id IS NOT DISTINCT FROM %s
            """, (
                now,
                session_id,
                user_id,
                company_id,
            ))

            if role == "user" and session.get("name") == "New Chat":
                title = " ".join((content or "").split()).strip()
                if len(title) > 60:
                    title = title[:57].rstrip() + "..."

                if title:
                    cursor.execute("""
                        UPDATE ai_sessions
                        SET name = %s
                        WHERE session_id = %s
                          AND user_id = %s
                          AND company_id IS NOT DISTINCT FROM %s
                    """, (
                        title,
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
