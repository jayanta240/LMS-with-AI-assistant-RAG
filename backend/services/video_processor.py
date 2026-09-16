import os
import subprocess
from uuid import uuid4

from faster_whisper import WhisperModel
from qdrant_client.models import PointStruct

from services.rag_engine import (
    get_client,
    get_embed_model,
    COLLECTION_NAME,
)


# ============================================================
# LOAD WHISPER MODEL ONCE
# ============================================================

model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)


# ============================================================
# EXTRACT AUDIO
# ============================================================

def extract_audio(video_path: str):

    wav_path = (
        video_path.rsplit(".", 1)[0]
        + ".wav"
    )

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            video_path,
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            wav_path
        ],
        check=True
    )

    return wav_path


# ============================================================
# PROCESS VIDEO
# ============================================================

def process_video(
    video_path: str,
    video_url: str,
    filename: str,
    company_id: int | None = None,
    department_id: int | None = None,
    course_id: int | None = None,
    uploaded_by: int | None = None,
    visibility: str = "company"
):

    print(
        f"\n🎬 Processing: {filename}"
    )

    print(
        f"🏢 Company ID: {company_id}"
    )

    print(
        f"🏬 Department ID: {department_id}"
    )

    print(
        f"📚 Course ID: {course_id}"
    )

    print(
        f"👤 Uploaded By: {uploaded_by}"
    )

    print(
        f"🔐 Visibility: {visibility}"
    )

    # ========================================================
    # EXTRACT AUDIO
    # ========================================================

    wav = extract_audio(
        video_path
    )

    print(
        "🎧 Audio extracted"
    )

    try:

        # ====================================================
        # TRANSCRIBE
        # ====================================================

        segments, _ = model.transcribe(
            wav
        )

        segments = list(
            segments
        )

        print(
            f"🧠 Segments detected: {len(segments)}"
        )

        if len(segments) == 0:

            print(
                "❌ No speech detected"
            )

            return 0

        # ====================================================
        # QDRANT
        # ====================================================

        client = get_client()

        embed_model = get_embed_model()

        points = []

        WINDOW_SIZE = 3

        # ====================================================
        # CREATE TRANSCRIPT CHUNKS
        # ====================================================

        for i in range(
            len(segments)
        ):

            chunk_segments = segments[
                i:i + WINDOW_SIZE
            ]

            if not chunk_segments:
                continue

            combined_text = " ".join(

                s.text.strip()

                for s in chunk_segments

                if s.text.strip()

            )

            if not combined_text:
                continue

            start_time = float(
                chunk_segments[0].start
            )

            end_time = float(
                chunk_segments[-1].end
            )

            # =================================================
            # EMBEDDING
            # =================================================

            embedding = (
                embed_model.get_text_embedding(
                    combined_text
                )
            )

            # =================================================
            # QDRANT PAYLOAD
            # =================================================

            payload = {

                # ---------------------------------------------
                # Video information
                # ---------------------------------------------

                "type": "video",

                "source": filename,

                "video": filename,

                "video_url": video_url,

                "start": start_time,

                "end": end_time,

                "text": combined_text,

                # ---------------------------------------------
                # SECURITY INFORMATION
                # ---------------------------------------------

                "company_id": company_id,

                "department_id": department_id,

                "course_id": course_id,

                "uploaded_by": uploaded_by,

                "visibility": visibility,

            }

            points.append(

                PointStruct(

                    id=str(uuid4()),

                    vector=embedding,

                    payload=payload

                )

            )

        # ====================================================
        # UPLOAD TO QDRANT
        # ====================================================

        print(
            f"📦 Uploading {len(points)} points to Qdrant..."
        )

        if points:

            client.upsert(

                collection_name=COLLECTION_NAME,

                points=points

            )

        print(
            "✅ VIDEO STORED in Qdrant"
        )

        return len(points)

    finally:

        # ====================================================
        # REMOVE TEMP AUDIO
        # ====================================================

        if os.path.exists(wav):

            try:

                os.remove(wav)

            except Exception as e:

                print(
                    "⚠️ Could not remove temporary WAV:",
                    e
                )