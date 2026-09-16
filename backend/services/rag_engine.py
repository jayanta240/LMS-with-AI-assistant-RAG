from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams,
    Distance,
    Filter,
    FieldCondition,
    MatchValue,
    MatchAny,
)
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

from config import settings


# ============================================================
# COLLECTIONS
# ============================================================

COLLECTION_NAME = "learning_content"
ISSUE_COLLECTION = "issue_images"


# ============================================================
# GLOBAL CLIENTS
# ============================================================

client = None
embed_model = None


# ============================================================
# INITIALIZE QDRANT
# ============================================================

def init_qdrant():
    global client, embed_model

    if client is not None:
        return

    # --------------------------------------------------------
    # QDRANT CLIENT
    # --------------------------------------------------------

    client = QdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY,
        timeout=30,
    )

    # --------------------------------------------------------
    # GET EXISTING COLLECTIONS
    # --------------------------------------------------------

    collections = [
        c.name
        for c in client.get_collections().collections
    ]

    # ========================================================
    # ISSUE IMAGE COLLECTION
    # ========================================================

    if ISSUE_COLLECTION not in collections:

        print("⚡ Creating issue image collection...")

        client.create_collection(
            collection_name=ISSUE_COLLECTION,
            vectors_config=VectorParams(
                size=512,
                distance=Distance.COSINE,
            ),
        )

        print("✅ Issue image collection created")

    # ========================================================
    # LEARNING CONTENT COLLECTION
    # ========================================================

    if COLLECTION_NAME not in collections:

        print("⚡ Creating learning content collection...")

        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=768,
                distance=Distance.COSINE,
            ),
        )

        print("✅ Learning content collection created")

    # ========================================================
    # PAYLOAD INDEXES
    # ========================================================

    existing_indexes = set()

    try:
        collection_info = client.get_collection(
            COLLECTION_NAME
        )

        payload_schema = (
            collection_info.payload_schema or {}
        )

        existing_indexes = set(
            payload_schema.keys()
        )

    except Exception as e:
        print(
            "⚠️ Could not inspect payload indexes:",
            e,
        )

    # --------------------------------------------------------
    # SOURCE
    # --------------------------------------------------------

    if "source" not in existing_indexes:
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="source",
            field_schema="keyword",
        )

    # --------------------------------------------------------
    # VIDEO
    # --------------------------------------------------------

    if "video" not in existing_indexes:
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="video",
            field_schema="keyword",
        )

    # --------------------------------------------------------
    # COMPANY ID
    # --------------------------------------------------------

    if "company_id" not in existing_indexes:
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="company_id",
            field_schema="integer",
        )

    # --------------------------------------------------------
    # DEPARTMENT ID
    # --------------------------------------------------------

    if "department_id" not in existing_indexes:
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="department_id",
            field_schema="integer",
        )

    # --------------------------------------------------------
    # COURSE ID
    # --------------------------------------------------------

    if "course_id" not in existing_indexes:
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="course_id",
            field_schema="integer",
        )

    # --------------------------------------------------------
    # UPLOADED BY
    # --------------------------------------------------------

    if "uploaded_by" not in existing_indexes:
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="uploaded_by",
            field_schema="integer",
        )

    # --------------------------------------------------------
    # VISIBILITY
    # --------------------------------------------------------

    if "visibility" not in existing_indexes:
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="visibility",
            field_schema="keyword",
        )

    print("✅ Qdrant payload indexes ready")

    # ========================================================
    # EMBEDDING MODEL
    # ========================================================

    embed_model = HuggingFaceEmbedding(
        model_name="BAAI/bge-base-en-v1.5"
    )

    print("✅ Qdrant Ready")


# ============================================================
# GET CLIENT
# ============================================================

def get_client():
    init_qdrant()
    return client


# ============================================================
# GET EMBEDDING MODEL
# ============================================================

def get_embed_model():
    init_qdrant()
    return embed_model


# ============================================================
# SEARCH
# ============================================================
#
# FINAL VISIBILITY MODEL:
#
# 1. Entire Company
# 2. Department
# 3. Course Enrollees
#
# COMPANY ISOLATION IS ALWAYS REQUIRED.
#
# A user can retrieve content only when:
#
#     content.company_id == user.company_id
#
# AND at least one of:
#
#     visibility == "company"
#
# OR
#
#     visibility == "department"
#     AND content.department_id == user's department_id
#
# OR
#
#     visibility == "course"
#     AND content.course_id is in user's enrolled course IDs
#
# ============================================================

def search(
    query: str,
    company_id: int | None = None,
    department_id: int | None = None,
    course_ids: list[int] | None = None,
    limit: int = 10,
):
    """
    Tenant-safe RAG search.

    Visibility rules:

    1. Company:
       Available to everyone in the same company.

    2. Department:
       Available only to users in the matching department.

    3. Course:
       Available only to users enrolled in the matching course.

    Company isolation is ALWAYS enforced.
    """

    init_qdrant()

    # --------------------------------------------------------
    # COMPANY CONTEXT IS REQUIRED
    # --------------------------------------------------------

    if company_id is None:
        raise ValueError(
            "company_id is required for tenant-safe RAG search."
        )

    # --------------------------------------------------------
    # NORMALIZE COURSE IDS
    # --------------------------------------------------------

    if course_ids is None:
        course_ids = []

    # --------------------------------------------------------
    # QUERY EMBEDDING
    # --------------------------------------------------------

    query_vector = embed_model.get_text_embedding(query)

    # ========================================================
    # ACCESS RULES
    # ========================================================

    access_rules = []

    # --------------------------------------------------------
    # 1. ENTIRE COMPANY
    # --------------------------------------------------------

    access_rules.append(
        Filter(
            must=[
                FieldCondition(
                    key="visibility",
                    match=MatchValue(
                        value="company"
                    ),
                )
            ]
        )
    )

    # --------------------------------------------------------
    # 2. DEPARTMENT
    # --------------------------------------------------------

    if department_id is not None:

        access_rules.append(
            Filter(
                must=[
                    FieldCondition(
                        key="visibility",
                        match=MatchValue(
                            value="department"
                        ),
                    ),
                    FieldCondition(
                        key="department_id",
                        match=MatchValue(
                            value=department_id
                        ),
                    ),
                ]
            )
        )

    # --------------------------------------------------------
    # 3. COURSE ENROLLEES
    # --------------------------------------------------------

    if course_ids:

        access_rules.append(
            Filter(
                must=[
                    FieldCondition(
                        key="visibility",
                        match=MatchValue(
                            value="course"
                        ),
                    ),
                    FieldCondition(
                        key="course_id",
                        match=MatchAny(
                            any=course_ids
                        ),
                    ),
                ]
            )
        )

    # ========================================================
    # FINAL QDRANT FILTER
    # ========================================================
    #
    # SAME COMPANY
    #
    # AND
    #
    # AT LEAST ONE ACCESS RULE
    #
    # ========================================================

    query_filter = Filter(
        must=[
            FieldCondition(
                key="company_id",
                match=MatchValue(
                    value=company_id
                ),
            )
        ],
        should=access_rules,
    )

    # ========================================================
    # QDRANT SEARCH
    # ========================================================

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=query_filter,
        limit=limit,
    )

    # ========================================================
    # FORMAT RESULTS
    # ========================================================

    formatted = []

    for point in results.points:

        payload = point.payload or {}

        formatted.append(
            {
                "text": payload.get(
                    "text",
                    ""
                ),
                "metadata": payload,
                "score": point.score,
            }
        )

    # ========================================================
    # DEBUG
    # ========================================================

    print(
        "\n🔍 DEBUG RESULTS ------------------"
    )

    print(
        "QUERY:",
        query,
    )

    print(
        "COMPANY:",
        company_id,
    )

    print(
        "DEPARTMENT:",
        department_id,
    )

    print(
        "COURSES:",
        course_ids,
    )

    print(
        "RESULT COUNT:",
        len(formatted),
    )

    for result in formatted:

        print(
            "TEXT:",
            result["text"][:100],
        )

        print(
            "META:",
            result["metadata"],
        )

        print(
            "SCORE:",
            result["score"],
        )

        print(
            "----------------------------------"
        )

    return formatted