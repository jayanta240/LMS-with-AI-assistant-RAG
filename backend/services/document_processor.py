from uuid import uuid4

from pypdf import PdfReader
from qdrant_client.models import PointStruct

from services.rag_engine import (
    get_client,
    get_embed_model,
    COLLECTION_NAME,
)


CHUNK_SIZE = 700
CHUNK_OVERLAP = 150


def split_text(text: str):

    text = text.replace("\n", " ")
    text = " ".join(text.split())

    chunks = []

    start = 0

    while start < len(text):

        end = start + CHUNK_SIZE

        chunk = text[start:end]

        chunks.append(chunk)

        start += CHUNK_SIZE - CHUNK_OVERLAP

    return chunks


def process_document(
    file_path: str,
    filename: str,
    company_id: int | None = None,
    department_id: int | None = None,
    course_id: int | None = None,
    uploaded_by: int | None = None,
    visibility: str = "company"
):

    print(f"\n📄 Processing document: {filename}")

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

    reader = PdfReader(file_path)

    client = get_client()

    embed_model = get_embed_model()

    points = []

    total_chunks = 0

    # =========================================================
    # PROCESS EACH PAGE
    # =========================================================

    for page_num, page in enumerate(reader.pages):

        text = page.extract_text()

        if not text:
            continue

        chunks = split_text(text)

        # =====================================================
        # PROCESS EACH CHUNK
        # =====================================================

        for chunk in chunks:

            chunk = chunk.strip()

            if len(chunk) < 30:
                continue

            embedding = embed_model.get_text_embedding(
                chunk
            )

            # =================================================
            # QDRANT PAYLOAD
            # =================================================

            payload = {

                # ---------------------------------------------
                # Basic document information
                # ---------------------------------------------

                "type": "document",

                "source": filename,

                "page": page_num + 1,

                "text": chunk,

                # ---------------------------------------------
                # SECURITY / ACCESS INFORMATION
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

            total_chunks += 1

    # =========================================================
    # UPLOAD TO QDRANT
    # =========================================================

    print(
        f"📦 Uploading {total_chunks} document chunks..."
    )

    if points:

        client.upsert(

            collection_name=COLLECTION_NAME,

            points=points

        )

    print(
        "✅ Document stored in Qdrant"
    )

    return total_chunks