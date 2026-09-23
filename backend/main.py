from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List,Optional
from services.auth_dependency import get_current_user
import os
import uuid
from qdrant_client.models import (
    Filter,
    FieldCondition,
    MatchValue,
    FilterSelector
)
from services.enrollment_db import (
    assign_course,
    get_user_courses,
    get_user_course_ids,
)
from services.company_db import (
    create_company,
    get_companies,
    get_company_count,
    get_company,
    update_company,
    delete_company,
    get_company_branding,
    update_company_branding
)
from models.schemas import (
    EnrollmentCreate
)
from services.image_service import upload_issue_image
import shutil
import cloudinary.uploader
import re
from services.user_db import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_all_users,
    get_user_count,
    delete_user,
    delete_company_admin,
    delete_department_head,
    get_user_progress
)

from services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token
)

from models.schemas import (
    UserRegister,
    UserLogin,
    CompanyCreate,
    CompanyUpdate,
    CompanyBrandingUpdate,
    DepartmentCreate,
    NotificationSettingsUpdate
)

from services.department_db import (
    create_department,
    get_departments,
    delete_department
)

from services.notification_db import (
    init_notification_db,
    get_notification_settings,
    update_notification_settings,
)

from services.certificate_service import (
    generate_certificate_pdf
)
from services.course_db import (
    init_course_db,
    create_course,
    get_courses,
    get_course,
    create_lesson,
    get_lessons,
    get_all_courses,
    get_course_stats,
    mark_lesson_complete,
    get_course_progress,
    get_completed_lessons,
    get_company_certificates,
    get_certificate,
    get_user_certificates,
    create_certificate,
    update_certificate_pdf_url,
    get_admin_analytics,
)

from services.video_generator import generate_video
from models.schemas import ChatRequest, ChatResponse, SourceItem,CourseCreate,LessonCreate,LessonProgressRequest
from services.translation_service import detect_lang, to_english, translate_back
from services.storage_service import upload_video
from services.rag_engine import (
    init_qdrant,
    search,
    get_client,
    COLLECTION_NAME
)
from services.issue_search_service import (
    search_issue_image
)
from uuid import uuid4
from qdrant_client.models import PointStruct
from services.image_embedding_service import (
    get_image_embedding
)

from services.rag_engine import (
    get_client,
    ISSUE_COLLECTION
)
from fastapi import Form
from fastapi.staticfiles import StaticFiles
from services.file_db import (
    init_db,
    add_file,
    get_all_files,
    get_file_count,
    delete_file,
    add_issue,
    get_all_issues,
    update_course,
    delete_course
)
app = FastAPI()
init_db()
init_course_db()
init_notification_db()
app.mount("/temp_videos", StaticFiles(directory="temp_videos"), name="temp_videos")
os.makedirs(
    "certificates",
    exist_ok=True
)

app.mount(
    "/certificates",
    StaticFiles(directory="certificates"),
    name="certificates"
)
# -----------------------------
# CORS
# -----------------------------
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://monorepo-ebon-eight.vercel.app",
        FRONTEND_URL,
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -----------------------------
# INIT QDRANT
# -----------------------------
@app.on_event("startup")
def startup():
    print("🚀 Initializing Qdrant...")
    init_qdrant()


# -----------------------------
# GLOBALS
# -----------------------------
os.makedirs("temp", exist_ok=True)
sessions = {}


# -----------------------------
# ROOT
# -----------------------------
@app.get("/")
def root():
    return {"status": "Backend Running"}


# -----------------------------
# HELPER: CHAPTER DETECTION
# -----------------------------
def extract_chapter_number(query: str):
    match = re.search(r"chapter\s*(\d+)", query.lower())
    return int(match.group(1)) if match else None


def classify_intent(message: str):

    msg = message.lower().strip()

    # -----------------------------
    # GREETING RULES
    # -----------------------------
    greetings = [
        "hi", "hello", "hey",
        "hii", "helloo",
        "good morning",
        "good evening",

        # Bengali
        "হ্যালো", "হাই",
        "কেমন আছো",

        # Hindi
        "नमस्ते", "हेलो",
        "क्या हाल"
    ]

    # exact short greeting only
    if msg in greetings:
        return "greeting"

    # very short greeting-like messages
    if len(msg.split()) <= 2 and any(g in msg for g in greetings):
        return "greeting"

    # -----------------------------
    # VIDEO GENERATION
    # -----------------------------
    video_keywords = [
        "generate video",
        "make video",
        "create video",
        "video banao",
        "ভিডিও বানাও",
        "ভিডিও তৈরি"
    ]

    if any(v in msg for v in video_keywords):
        return "video_generation"

    # -----------------------------
    # SUMMARIZATION
    # -----------------------------
    summary_keywords = [
        "summarize",
        "summary",
        "summarise",
        "সংক্ষেপ",
        "সারাংশ",
        "सारांश"
    ]

    if any(s in msg for s in summary_keywords):
        return "summarization"

    # -----------------------------
    # DEFAULT
    # -----------------------------
    return "learning_question"                                    
# -----------------------------
# CHAT
# -----------------------------


def get_owned_session(
    session_id: str,
    current_user
):
    session_data = sessions.get(session_id)

    if not session_data:
        raise HTTPException(
            status_code=404,
            detail="Chat session not found."
        )

    user_id = current_user.get("user_id")
    company_id = current_user.get("company_id")

    if (
        session_data.get("user_id") != user_id
        or session_data.get("company_id") != company_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this chat."
        )

    return session_data


@app.post("/api/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    current_user=Depends(get_current_user)
):
    session_data = get_owned_session(
        req.session_id,
        current_user
    )    
    from services.llm_service import ask_llm

    # ============================================================
    # AUTHENTICATED USER / COMPANY
    # ============================================================

    user_company_id = current_user.get("company_id")
    user_id = current_user.get("user_id")
    user_department_id = current_user.get("department_id")

    user_course_ids = get_user_course_ids(
        user_id
    )
    

    if user_company_id is None:

        raise HTTPException(
            status_code=403,
            detail="Your account is not associated with a company."
        )

    print(
        "🔐 CHAT USER:",
        current_user.get("user_id")
    )

    print(
        "🏢 CHAT COMPANY:",
        user_company_id
    )

    print(
        "👤 CHAT ROLE:",
        current_user.get("role")
    )

    # ============================================================
    # MULTILINGUAL LANGUAGE HANDLING
    # Supports English, Hindi and Bengali.
    # User question is translated to English for retrieval, then
    # the final answer is translated back to the user's language.
    # ============================================================

    try:
        lang = detect_lang(req.message) or "en"
    except Exception as language_error:
        print("⚠️ Language detection failed:", language_error)
        lang = "en"

    # Keep this demo explicitly limited to the languages we are
    # activating for the client meeting. Unknown detections fall
    # back to English instead of breaking the request.
    if lang not in {"en", "hi", "bn"}:
        print("⚠️ Unsupported detected language:", lang, "→ using English")
        lang = "en"

    print("🌐 DETECTED LANGUAGE:", lang)

    # ------------------------------------------------------------
    # Translate question to English for Qdrant retrieval.
    # This is important because the indexed PDF/DOCX/video content
    # is being searched through one stable retrieval language.
    # ------------------------------------------------------------

    if lang == "en":
        english_query = req.message
    else:
        try:
            english_query = to_english(req.message)
        except Exception as translation_error:
            print("⚠️ Query translation failed:", translation_error)
            # Do not crash the chat. We can still attempt retrieval
            # using the original user text.
            english_query = req.message

    language_instruction = {
        "en": "IMPORTANT: Answer in English.",
        "hi": "IMPORTANT: Answer in Hindi (हिंदी). Do not answer in English or Bengali.",
        "bn": "IMPORTANT: Answer in Bengali (বাংলা). Do not answer in English or Hindi.",
    }[lang]

    # ============================================================
    # INTENT DETECTION
    # ============================================================

    intent = classify_intent(
        english_query
    )

    print(
        "🧠 Intent:",
        intent
    )

    # ============================================================
    # GREETING
    # ============================================================

    if intent == "greeting":

        # Generate one canonical greeting and translate it back
        # so greeting behavior remains consistent for all three languages.
        answer = "Hello 👋 How can I help you with your learning today?"

        if lang != "en":
            try:
                answer = translate_back(answer, lang)
            except Exception as translation_error:
                print("⚠️ Greeting translation failed:", translation_error)

        

        session_data["messages"].append(
            {
                "role": "user",
                "content": req.message
            }
        )

        session_data["messages"].append(
            {
                "role": "assistant",
                "content": answer
            }
        )

        return ChatResponse(
            answer=answer,
            sources=[]
        )

    # ============================================================
    # SUMMARIZATION
    # ============================================================

    if intent == "summarization":

        print(
            "📚 Summarization request detected"
        )

    # ============================================================
    # VIDEO GENERATION
    # ============================================================

    if intent == "video_generation":

        print(
            "🎬 Video request detected"
        )

   

    # ============================================================
    # NORMAL QDRANT SEMANTIC RETRIEVAL
    #
    # Used for:
    #   PDF
    #   DOCX
    #   Video transcripts
    #   General knowledge questions
    # ============================================================

    results = search(

        query=english_query,

        company_id=user_company_id,
        department_id=user_department_id,
        course_ids=user_course_ids,

        limit=10

    )

    print(
        "🔐 SECURE SEARCH COMPANY:",
        user_company_id
    )

    # ============================================================
    # NO RESULTS
    # ============================================================

    if not results:

        answer = (
            "No relevant information was found in the uploaded files "
            "available to your company."
        )

        if lang != "en":
            try:
                answer = translate_back(answer, lang)
            except Exception as translation_error:
                print("⚠️ No-results translation failed:", translation_error)

        

        session_data["messages"].append(
            {
                "role": "user",
                "content": req.message
            }
        )

        session_data["messages"].append(
            {
                "role": "assistant",
                "content": answer
            }
        )

        return ChatResponse(
            answer=answer,
            sources=[]
        )

    # ============================================================
    # CHAPTER HANDLING
    # ============================================================

    chapter_num = extract_chapter_number(
        english_query
    )

    if chapter_num:

        results = [

            r

            for r in results

            if r["metadata"].get(
                "type"
            ) == "document"

        ]

        results = [

            r

            for r in results

            if r["metadata"].get(
                "page"
            ) in [
                chapter_num,
                chapter_num + 1
            ]

        ]

        top = (
            results[:40]
            if results
            else []
        )

    else:

        ranked = sorted(

            results,

            key=lambda x:
                x["score"],

            reverse=True

        )

        top = ranked[:10]

    # ============================================================
    # SIMILARITY
    # ============================================================

    best_score = (
        top[0]["score"]
        if top
        else 0
    )

    print(
        "🔥 Best Similarity:",
        best_score
    )

    MIN_SCORE = 0.60

    relevant_content_found = (
        best_score >= MIN_SCORE
    )

    # ============================================================
    # CONTEXT
    # ============================================================

    context_parts = []

    seen_texts = set()

    for r in top:

        metadata = r.get(
            "metadata",
            {}
        )

        text = r.get(
            "text",
            ""
        )

        if not text:
            continue

        # --------------------------------------------------------
        # SPREADSHEET
        # --------------------------------------------------------

        if metadata.get(
            "type"
        ) == "spreadsheet":

            if text not in seen_texts:

                context_parts.append(
                    "Spreadsheet Row:\n"
                    + text
                )

                seen_texts.add(
                    text
                )

        # --------------------------------------------------------
        # VIDEO
        # --------------------------------------------------------

        elif metadata.get(
            "type"
        ) == "video":

            if text not in seen_texts:

                context_parts.append(
                    text
                )

                seen_texts.add(
                    text
                )

            current_start = metadata.get(
                "start",
                0
            )

            for neighbor in results:

                neighbor_metadata = (
                    neighbor.get(
                        "metadata",
                        {}
                    )
                )

                if neighbor_metadata.get(
                    "type"
                ) != "video":

                    continue

                neighbor_start = (
                    neighbor_metadata.get(
                        "start",
                        0
                    )
                )

                if abs(
                    neighbor_start
                    - current_start
                ) <= 6:

                    neighbor_text = (
                        neighbor.get(
                            "text",
                            ""
                        )
                    )

                    if (
                        neighbor_text
                        and neighbor_text
                        not in seen_texts
                    ):

                        context_parts.append(
                            neighbor_text
                        )

                        seen_texts.add(
                            neighbor_text
                        )

        # --------------------------------------------------------
        # PDF / DOCX
        # --------------------------------------------------------

        else:

            if text not in seen_texts:

                context_parts.append(
                    text
                )

                seen_texts.add(
                    text
                )

    context = "\n\n".join(
        context_parts
    )

    print(
        "📚 FINAL CONTEXT:"
    )

    print(
        context[:3000]
    )

    # ============================================================
    # MODE
    # ============================================================

    mode = getattr(
        req,
        "mode",
        "normal"
    )

    if mode == "summary":

        instruction = (
            "Summarize ONLY the retrieved context."
        )

    elif mode == "points":

        instruction = (
            "Answer ONLY in concise bullet points "
            "from the retrieved context."
        )

    else:

        instruction = (
            "Answer ONLY from the retrieved context. "
            "Do not add extra explanations."
        )

    # ============================================================
    # CONVERSATION MEMORY
    # ============================================================

    chat_history = session_data.get(
        "messages",
        []
    )

    history_text = ""

    for msg in chat_history[-6:]:

        role = msg["role"]

        if role == "user":

            history_text += (
                f"User: {msg['content']}\n"
            )

        else:

            history_text += (
                f"Assistant: {msg['content']}\n"
            )

    # ============================================================
    # PROMPT
    # ============================================================

    if relevant_content_found:

        prompt = f"""
You are an intelligent AI learning assistant.

{language_instruction}

IMPORTANT RULES:

- NEVER switch language.
- ALWAYS answer in the user's language.
- Answer ONLY using the retrieved context.
- The context belongs ONLY to the authenticated user's company.
- Never reveal information from another company.
- The context may contain PDF pages, video transcripts, or spreadsheet rows.
- If the answer exists in spreadsheet rows, answer from those rows.
- If multiple spreadsheet rows satisfy the question, include the relevant rows.
- Never invent values that are not present.
- Do not use outside knowledge if the answer exists in the retrieved context.
- Do NOT invent examples.
- Do NOT elaborate unnecessarily.
- Keep the answer concise and focused.
- Ignore unrelated context.
- Never hallucinate extra technical explanations.



CONVERSATION HISTORY:
{history_text}

CONTEXT:
{context}

QUESTION:
{english_query}

INSTRUCTION:
{instruction}

GUIDELINES:

- Use ONLY uploaded content available to this company.
- Keep answer precise.
- Avoid unnecessary explanation.
- Format structured data clearly.
- Do not add information not present in context.
"""

    else:

        prompt = f"""
You are an intelligent AI learning assistant.

{language_instruction}

IMPORTANT:

The uploaded learning materials available to this company
do NOT contain enough information about this topic.

FIRST clearly mention:

"⚠️ This topic was not found in the uploaded learning materials."

THEN provide:

"A quick general explanation:"

AFTER THAT:

- Explain using your own general knowledge.
- Keep the explanation educational and simple.
- Explain like a teacher.
- Keep the answer concise but useful.
- NEVER reveal or infer information from another company.
- NEVER switch language unnecessarily.

CONVERSATION HISTORY:
{history_text}

QUESTION:
{english_query}
"""

    print(
        "PROMPT LENGTH:",
        len(prompt)
    )

    print(
        "CONTEXT LENGTH:",
        len(context)
    )

    print(
        "TOP RESULTS:",
        len(top)
    )

    # ============================================================
    # LLM
    # ============================================================

    answer = ask_llm(
        prompt
    )

    # ============================================================
    # FINAL LANGUAGE OUTPUT
    # Translate the model's answer back to the language used
    # by the user. Retrieval still happens in English.
    # ============================================================

    if lang != "en":
        try:
            answer = translate_back(answer, lang)
        except Exception as translation_error:
            print("⚠️ Answer translation failed:", translation_error)
            # Keep the English answer rather than returning a 500.

    # ============================================================
    # SOURCES
    # ============================================================

    sources = []

    if relevant_content_found:

        seen_sources = set()

        for r in top:

            metadata = r[
                "metadata"
            ]

            source_name = (
                metadata.get("source")
                or metadata.get("video")
                or "Uploaded content"
            )

            source_key = (
                source_name,
                metadata.get("page"),
                metadata.get("video"),
                metadata.get("start"),
            )

            if source_key in seen_sources:

                continue

            seen_sources.add(
                source_key
            )

            sources.append(

                SourceItem(

                    type=metadata.get(
                        "type"
                    ),

                    video=metadata.get(
                        "video"
                    ),

                    video_url=metadata.get(
                        "video_url"
                    ),

                    start=metadata.get(
                        "start"
                    ),

                    end=metadata.get(
                        "end"
                    ),

                    source=metadata.get(
                        "source"
                    ),

                    page=metadata.get(
                        "page"
                    )

                )

            )

            if len(sources) >= 5:
                break

    # ============================================================
    # SAVE SESSION
    # ============================================================

    

    session_data["messages"].append(
    {
        "role": "user",
        "content": req.message
    }
)

    session_data["messages"].append(
    {
        "role": "assistant",
        "content": answer
    }
)

    # ============================================================
    # RESPONSE
    # ============================================================

    return ChatResponse(

        answer=answer,

        sources=sources

    )
@app.post("/api/upload")
async def upload(
    files: List[UploadFile] = File(...),

    # -------------------------------------------------
    # Access control for uploaded content
    # -------------------------------------------------
    visibility: str = Form("company"),

    department_id: Optional[int] = Form(None),

    course_id: Optional[int] = Form(None),

    current_user=Depends(get_current_user)
):

    from services.video_processor import process_video
    from services.document_processor import process_document

    # =================================================
    # ONLY COMPANY ADMIN CAN UPLOAD
    # =================================================

    if current_user["role"] != "company_admin":

        raise HTTPException(
            status_code=403,
            detail="Only company administrators can upload assistant content."
        )

    # =================================================
    # GET COMPANY / USER FROM AUTHENTICATED USER
    # =================================================

    company_id = current_user.get("company_id")
    uploaded_by = current_user.get("user_id")

    if company_id is None:

        raise HTTPException(
            status_code=400,
            detail="Company information is missing from the authenticated user."
        )

    if uploaded_by is None:

        raise HTTPException(
            status_code=400,
            detail="User information is missing from the authenticated user."
        )

    # =================================================
    # VALIDATE VISIBILITY
    # =================================================

    allowed_visibility = {
        "company",
        "department",
        "course"
    }

    if visibility not in allowed_visibility:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid visibility. "
                "Use 'company', 'department', or 'course'."
            )
        )

    # =================================================
    # COMPANY VISIBILITY
    # =================================================
    #
    # No department/course is required.
    # We explicitly clear them so the metadata stays clean.
    # =================================================

    if visibility == "company":

        department_id = None
        course_id = None

    # =================================================
    # DEPARTMENT VISIBILITY
    # =================================================

    elif visibility == "department":

        if department_id is None:

            raise HTTPException(
                status_code=400,
                detail=(
                    "department_id is required "
                    "when visibility is 'department'."
                )
            )

        # ------------------------------------------------
        # VERIFY DEPARTMENT BELONGS TO THIS COMPANY
        # ------------------------------------------------

        departments = get_departments(company_id)

        department_exists = any(
            row[0] == department_id
            for row in departments
        )

        if not department_exists:

            raise HTTPException(
                status_code=403,
                detail=(
                    "The selected department does not "
                    "belong to your company."
                )
            )

        # Course must not be attached to department content
        course_id = None

    # =================================================
    # COURSE VISIBILITY
    # =================================================

    elif visibility == "course":

        if course_id is None:

            raise HTTPException(
                status_code=400,
                detail=(
                    "course_id is required "
                    "when visibility is 'course'."
                )
            )

        # ------------------------------------------------
        # VERIFY COURSE BELONGS TO THIS COMPANY
        # ------------------------------------------------

        course = get_course(
            course_id,
            company_id=company_id
        )

        if not course:

            raise HTTPException(
                status_code=403,
                detail=(
                    "The selected course does not "
                    "belong to your company."
                )
            )

        # Course visibility does not require a department
        department_id = None

    # =================================================
    # INITIALIZE QDRANT
    # =================================================

    init_qdrant()

    uploaded = []
    failed = []

    # =================================================
    # PROCESS FILES
    # =================================================

    for file in files:

        temp_path = None

        try:

            # -----------------------------------------
            # TEMP DIRECTORY
            # -----------------------------------------

            os.makedirs(
                "temp",
                exist_ok=True
            )

            temp_path = os.path.join(
                "temp",
                file.filename
            )

            # -----------------------------------------
            # SAVE TEMP FILE
            # -----------------------------------------

            with open(
                temp_path,
                "wb"
            ) as buffer:

                shutil.copyfileobj(
                    file.file,
                    buffer
                )

            # -----------------------------------------
            # FILE SIZE
            # -----------------------------------------

            size_mb = round(
                os.path.getsize(temp_path)
                / (1024 * 1024),
                2
            )

            # =================================================
            # COMMON SECURITY METADATA
            # =================================================

            content_metadata = {
                "company_id": company_id,
                "department_id": department_id,
                "course_id": course_id,
                "uploaded_by": uploaded_by,
                "visibility": visibility
            }

            print(
                "\n🔐 UPLOAD ACCESS METADATA"
            )

            print(
                "Company:",
                company_id
            )

            print(
                "Department:",
                department_id
            )

            print(
                "Course:",
                course_id
            )

            print(
                "Uploaded By:",
                uploaded_by
            )

            print(
                "Visibility:",
                visibility
            )

            # =================================================
            # VIDEO
            # =================================================

            if file.filename.lower().endswith(
                (".mp4", ".mov", ".avi")
            ):

                cloud = upload_video(
                    temp_path
                )

                process_video(
                    temp_path,
                    cloud["url"],
                    file.filename,

                    # Security metadata
                    company_id=company_id,
                    department_id=department_id,
                    course_id=course_id,
                    uploaded_by=uploaded_by,
                    visibility=visibility
                )

                add_file(
                    filename=file.filename,
                    filetype="video",
                    cloudinary_url=cloud["url"],
                    size_mb=size_mb,
                    company_id=company_id
                )

            # =================================================
            # PDF / DOCX
            # =================================================

            elif file.filename.lower().endswith(
                (".pdf", ".docx")
            ):

                process_document(
                    temp_path,
                    file.filename,

                    # Security metadata
                    company_id=company_id,
                    department_id=department_id,
                    course_id=course_id,
                    uploaded_by=uploaded_by,
                    visibility=visibility
                )

                # Store the original document so it can also be
                # attached to LMS lessons and downloaded by employees.
                cloud = cloudinary.uploader.upload(
                    temp_path,
                    resource_type="raw"
                )

                add_file(
                    filename=file.filename,
                    filetype="document",
                    cloudinary_url=cloud["secure_url"],
                    size_mb=size_mb,
                    company_id=company_id
                )

            # =================================================
            # UNSUPPORTED
            # =================================================

            else:

                raise Exception(
                    f"Unsupported file type: {file.filename}"
                )

            # =================================================
            # SUCCESS
            # =================================================

            uploaded.append(
                file.filename
            )

        except Exception as e:

            print(
                f"❌ Upload failed: {file.filename}"
            )

            print(
                str(e)
            )

            failed.append({
                "file": file.filename,
                "error": str(e)
            })

        finally:

            # -----------------------------------------
            # DELETE TEMP FILE
            # -----------------------------------------

            if (
                temp_path
                and os.path.exists(temp_path)
            ):

                try:

                    os.remove(
                        temp_path
                    )

                except Exception as cleanup_error:

                    print(
                        "⚠️ Could not remove temp file:",
                        cleanup_error
                    )

    # =================================================
    # RESPONSE
    # =================================================

    return {

        "success": len(failed) == 0,

        "uploaded": uploaded,

        "failed": failed,

        "access": {

            "company_id": company_id,

            "department_id": department_id,

            "course_id": course_id,

            "uploaded_by": uploaded_by,

            "visibility": visibility

        }

    }
# -----------------------------
# FILE MANAGEMENT
# -----------------------------
@app.get("/api/files")
def list_files(
    current_user=Depends(get_current_user)
):

    role = current_user["role"]
    company_id = current_user.get("company_id")

    if role == "super_admin":

        files = get_all_files()

    elif role in [
        "company_admin",
        "department_head",
    ]:

        if company_id is None:

            raise HTTPException(
                status_code=403,
                detail="Company information is missing."
            )

        files = [
            f
            for f in get_all_files()
            if f[6] == company_id
        ]

    else:

        raise HTTPException(
            status_code=403,
            detail="Permission denied."
        )

    formatted = []

    for f in files:

        formatted.append({
            "id": f[0],
            "filename": f[1],
            "filetype": f[2],
            "cloudinary_url": f[3],
            "size_mb": f[4],
            "uploaded_at": f[5],
            "company_id": f[6],
        })

    return formatted

# -----------------------------
# DELETE FILE
# -----------------------------
@app.delete("/api/files/{file_id}")
def delete_uploaded_file(
    file_id: int,
    current_user=Depends(get_current_user)
):

    if current_user["role"] not in [
        "super_admin",
        "company_admin",
    ]:

        raise HTTPException(
            status_code=403,
            detail="Only Super Admin and Company Admin can delete files."
        )

    files = get_all_files()

    target = None

    for f in files:

        if f[0] == file_id:
            target = f
            break

    if not target:
        return {
            "success": False,
            "message": "File not found"
        }

    company_id = current_user.get("company_id")

    if (
        current_user["role"] != "super_admin"
        and target[6] != company_id
    ):

        raise HTTPException(
            status_code=403,
            detail="You cannot delete a file from another company."
        )

    filename = target[1]
    cloudinary_url = target[3]

    try:

        # --------------------------------
        # DELETE FROM QDRANT
        # --------------------------------
        client = get_client()

        client.delete(
            collection_name=COLLECTION_NAME,
            wait=True,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[
                        FieldCondition(
                            key="video",
                            match=MatchValue(value=filename)
                        )
                    ]
                )
            )
        )

        print("✅ Deleted Qdrant vectors")

    except Exception as e:
        print("❌ Qdrant delete error:", e)

    try:

        # --------------------------------
        # DELETE FROM CLOUDINARY
        # --------------------------------
        if cloudinary_url:

            filename_part = cloudinary_url.split("/")[-1]

            if target[2] == "document":
                public_id = filename_part
                resource_type = "raw"
            else:
                public_id = filename_part.split(".")[0]
                resource_type = "video"

            cloudinary.uploader.destroy(
                public_id,
                resource_type=resource_type
            )

            print("✅ Deleted Cloudinary file")

    except Exception as e:
        print("❌ Cloudinary delete error:", e)

    try:

        # --------------------------------
        # DELETE DATABASE ENTRY
        # --------------------------------
        delete_file(file_id)

        print("✅ Deleted database entry")

    except Exception as e:
        print("❌ Database delete error:", e)

    return {
        "success": True,
        "message": "File deleted successfully"
    }

@app.post("/api/upload-image")
async def upload_image(
    file: UploadFile = File(...)
):

    temp_path = f"temp/{file.filename}"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    cloud = upload_issue_image(temp_path)

    if os.path.exists(temp_path):
        os.remove(temp_path)

    return {
        "success": True,
        "image_url": cloud["url"],
        "public_id": cloud["public_id"]
    }
@app.post("/api/upload-issue")
async def upload_issue(
    file: UploadFile = File(...),
    problem: str = Form(...),
    solution: str = Form(...)
):

    temp_path = f"temp/{file.filename}"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    cloud = upload_issue_image(temp_path)
    embedding = get_image_embedding(
         temp_path
    )

    client = get_client()

    client.upsert(
        collection_name=ISSUE_COLLECTION,
        points=[
            PointStruct(
                id=str(uuid4()),
                vector=embedding,
                payload={
                    "problem": problem,
                    "solution": solution,
                    "image_url": cloud["url"]
                }
            )
        ]
    )

    print("✅ Issue image stored in Qdrant")

    add_issue(
        image_url=cloud["url"],
        public_id=cloud["public_id"],
        problem=problem,
        solution=solution
    )

    if os.path.exists(temp_path):
        os.remove(temp_path)

    return {
        "success": True,
        "image_url": cloud["url"]
    }
@app.get("/api/issues")
def list_issues():

    issues = get_all_issues()

    result = []

    for i in issues:

        result.append({
            "id": i[0],
            "image_url": i[1],
            "public_id": i[2],
            "problem": i[3],
            "solution": i[4],
            "created_at": i[5]
        })

    return result
@app.post("/api/diagnose-image")
async def diagnose_image(
    file: UploadFile = File(...)
):

    temp_path = f"temp/{file.filename}"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    result = search_issue_image(
        temp_path
    )

    if os.path.exists(temp_path):
        os.remove(temp_path)

    if not result:
        return {
            "success": False,
            "message": "No matching issue found"
        }

    return {
        "success": True,
        "similarity": result["score"],
        "problem": result["problem"],
        "solution": result["solution"]
    }
@app.post("/api/generate-video")
def generate_video_api(req: ChatRequest):
    from services.rag_engine import search
    from services.llm_service import ask_llm
    import json

    try:
        # ---------------- SEARCH ----------------
        results = search(req.message)

        if not results:
            return {"error": "No relevant content"}

        top = sorted(results, key=lambda x: x["score"], reverse=True)[:8]

        context = "\n".join([r["text"] for r in top])

        # ---------------- AI SCENE CREATION ----------------
        prompt = f"""
You are an AI educational video creator.

Create short explainer video scenes.

Return ONLY valid JSON.

Format:
[
  {{
    "scene_title": "Scene title",
    "narration": "Educational narration for students"
  }}
]

Rules:
- 4 to 6 scenes
- educational style
- easy for students
- short narration
- no markdown
- make scenes flow naturally

Context:
{context}

Topic:
{req.message}
"""

        response = ask_llm(prompt)

        response = response.strip()

        if response.startswith("```json"):
            response = response.replace("```json", "").replace("```", "")

        scenes = json.loads(response)

        # ---------------- VIDEO ----------------
        video_path = generate_video(scenes)

        return {
            "video_path": video_path,
            "scenes": scenes
        }

    except Exception as e:
        print("❌ Video generation error:", e)
        return {"error": str(e)}
# ============================================================
# CHAT SESSIONS
# ============================================================

@app.get("/api/sessions")
def get_sessions(
    current_user=Depends(get_current_user)
):
    user_id = current_user.get("user_id")
    company_id = current_user.get("company_id")

    user_sessions = []

    for session_id, session_data in sessions.items():

        if not isinstance(session_data, dict):
            continue

        if (
            session_data.get("user_id") == user_id
            and session_data.get("company_id") == company_id
        ):
            user_sessions.append({
                "id": session_id,
                "name": session_data.get(
                    "name",
                    "New Chat"
                ),
            })

    return user_sessions


@app.post("/api/sessions")
def create_session(
    current_user=Depends(get_current_user)
):

    user_id = current_user.get("user_id")
    company_id = current_user.get("company_id")

    if user_id is None:
        raise HTTPException(
            status_code=403,
            detail="User identity not found."
        )

    session_id = str(uuid.uuid4())

    sessions[session_id] = {
        "user_id": user_id,
        "company_id": company_id,
        "name": "New Chat",
        "messages": [],
    }

    return {
        "id": session_id,
        "name": "New Chat",
    }


@app.get("/api/sessions/{session_id}/messages")
def get_messages(
    session_id: str,
    current_user=Depends(get_current_user)
):

    session_data = sessions.get(
        session_id
    )

    if not session_data:
        raise HTTPException(
            status_code=404,
            detail="Chat session not found."
        )

    user_id = current_user.get("user_id")
    company_id = current_user.get("company_id")

    if (
        session_data.get("user_id") != user_id
        or session_data.get("company_id") != company_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this chat."
        )

    return session_data.get(
        "messages",
        []
    )


@app.get("/api/courses")
async def get_courses_api(
    current_user=Depends(get_current_user)
):
    role = current_user["role"]
    company_id = current_user.get("company_id")
    user_id = current_user.get("user_id")

    # Super Admin can see all courses.
    if role == "super_admin":
        rows = get_all_courses()

    # Employee sees only courses assigned to them.
    elif role == "employee":
        rows = get_user_courses(user_id)

        # get_user_courses() already returns structured course data,
        # so return it directly.
        return rows

    # Company Admin / Department Head:
    # only courses belonging to their company.
    elif role in ["company_admin", "department_head"]:
        if company_id is None:
            raise HTTPException(
                status_code=403,
                detail="Company information is missing."
            )

        rows = get_courses(company_id)

    else:
        raise HTTPException(
            status_code=403,
            detail="Permission denied."
        )

    courses = []

    for row in rows:
        courses.append({
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "thumbnail_url": row[3],
            "created_at": row[4],
            "company_id": row[5],
        })

    return courses
@app.post("/api/courses")
async def create_course_api(
    data: CourseCreate,
    current_user=Depends(get_current_user)
):
    role = current_user["role"]
    company_id = current_user.get("company_id")

    # Courses can be created only inside an assigned company.
    if role not in [
        "company_admin",
        "department_head"
    ]:
        raise HTTPException(
            status_code=403,
            detail="Only Company Admins and Department Heads can create courses."
        )

    if company_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not associated with a company."
        )

    course_id = create_course(
        company_id=company_id,
        title=data.title,
        description=data.description,
        thumbnail_url=data.thumbnail_url or ""
    )

    return {
        "success": True,
        "course_id": course_id,
        "company_id": company_id
    }
@app.get("/api/courses/{course_id}")
async def get_course_api(
    course_id: int,
    current_user=Depends(get_current_user)
):
    role = current_user["role"]
    company_id = current_user.get("company_id")
    user_id = current_user.get("user_id")

    # Super Admin
    if role == "super_admin":
        row = get_course(course_id)

    # Employee: course must be assigned to this employee.
    elif role == "employee":
        allowed_course_ids = get_user_course_ids(user_id)

        if course_id not in allowed_course_ids:
            raise HTTPException(
                status_code=403,
                detail="You are not enrolled in this course."
            )

        row = get_course(course_id)

    # Company Admin / Department Head:
    # course must belong to their company.
    elif role in ["company_admin", "department_head"]:

        if company_id is None:
            raise HTTPException(
                status_code=403,
                detail="Company information is missing."
            )

        row = get_course(
            course_id,
            company_id=company_id
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="Permission denied."
        )

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Course not found."
        )

    return {
        "id": row[0],
        "title": row[1],
        "description": row[2],
        "thumbnail_url": row[3],
        "created_at": row[4],
        "company_id": row[5],
    }

@app.post("/api/lessons")
async def create_lesson_api(
    data: LessonCreate,
    current_user=Depends(get_current_user)
):
    role = current_user["role"]
    company_id = current_user.get("company_id")

    if role not in [
        "company_admin",
        "department_head"
    ]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied."
        )

    if company_id is None:
        raise HTTPException(
            status_code=403,
            detail="Company information is missing."
        )

    try:
        lesson_id = create_lesson(
            course_id=data.course_id,
            title=data.title,
            content_type=data.content_type,
            content_url=data.content_url,
            lesson_order=data.lesson_order,
            company_id=company_id
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc)
        )

    return {
        "success": True,
        "lesson_id": lesson_id
    }
@app.get("/api/courses/{course_id}/lessons")
async def get_course_lessons_api(
    course_id: int,
    current_user=Depends(get_current_user)
):
    role = current_user["role"]
    company_id = current_user.get("company_id")
    user_id = current_user.get("user_id")

    # Super Admin
    if role == "super_admin":
        rows = get_lessons(course_id)

    # Employee
    elif role == "employee":

        allowed_course_ids = get_user_course_ids(user_id)

        if course_id not in allowed_course_ids:
            raise HTTPException(
                status_code=403,
                detail="You are not enrolled in this course."
            )

        rows = get_lessons(course_id)

    # Company Admin / Department Head
    elif role in ["company_admin", "department_head"]:

        if company_id is None:
            raise HTTPException(
                status_code=403,
                detail="Company information is missing."
            )

        rows = get_lessons(
            course_id,
            company_id=company_id
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="Permission denied."
        )

    lessons = []

    for row in rows:
        lessons.append({
            "id": row[0],
            "course_id": row[1],
            "title": row[2],
            "content_type": row[3],
            "content_url": row[4],
            "lesson_order": row[5],
            "created_at": row[6],
        })

    return lessons
@app.post("/api/auth/register")
async def register_user(
    data: UserRegister,
    current_user = Depends(get_current_user)
):

    existing_user = get_user_by_email(
        data.email
    )

    if existing_user:

        return {
            "success": False,
            "message": "Email already exists"
        }

    # ---------------------------------
    # SUPER ADMIN
    # Can create Company Admin only
    # ---------------------------------

    if current_user["role"] == "super_admin":

        if data.role != "company_admin":

            raise HTTPException(
                status_code=403,
                detail="Super Admin can only create Company Admins."
            )

        if not data.company_id or data.company_id <= 0:

            raise HTTPException(
                status_code=400,
                detail="A valid company must be selected."
            )

        selected_company = get_company(
            data.company_id
        )

        if not selected_company:

            raise HTTPException(
                status_code=404,
                detail="Selected company was not found."
            )

    # ---------------------------------
    # COMPANY ADMIN
    # Can create Department Heads
    # and Employees
    # ---------------------------------

    elif current_user["role"] == "company_admin":

        if data.role not in [
            "department_head",
            "employee"
        ]:

            raise HTTPException(
                status_code=403,
                detail="Permission denied."
            )

        # Never trust frontend
        data.company_id = current_user["company_id"]

    # ---------------------------------
    # DEPARTMENT HEAD
    # Can create Employees only
    # ---------------------------------

    elif current_user["role"] == "department_head":

        if data.role != "employee":

            raise HTTPException(
                status_code=403,
                detail="Permission denied."
            )

        data.company_id = current_user["company_id"]

        data.department_id = current_user["department_id"]

    # ---------------------------------
    # EMPLOYEE
    # Cannot create users
    # ---------------------------------

    else:

        raise HTTPException(
            status_code=403,
            detail="Permission denied."
        )

    password_hash = hash_password(
        data.password
    )

    user_id = create_user(
        name=data.name,
        email=data.email,
        password_hash=password_hash,
        role=data.role,
        company_id=data.company_id,
        department_id=data.department_id
    )

    return {
        "success": True,
        "user_id": user_id
    }

@app.post("/api/auth/login")
async def login_user(
    data: UserLogin
):

    user = get_user_by_email(
        data.email
    )

    if not user:

        return {
            "success": False,
            "message": "Invalid credentials"
        }

    password_valid = verify_password(
        data.password,
        user[3]
    )

    if not password_valid:

        return {
            "success": False,
            "message": "Invalid credentials"
        }

    token = create_access_token(
        user_id=user[0],
        email=user[2],
        role=user[4],company_id=user[5],
        department_id=user[6]
    )

    branding = (
        get_company_branding(user[5])
        if user[5] is not None
        else None
    )

    return {
        "success": True,
        "access_token": token,
        "role": user[4],
        "name": user[1],
        "email": user[2],
        "user_id": user[0],
        "company_id": user[5],
        "department_id": user[6],
        "branding": branding
    }
@app.get("/api/users")
async def get_users_api(
    current_user=Depends(get_current_user)
):

    rows = get_all_users()

    users = []

    for row in rows:

        # Employees page must contain employees only.
        if row[3] != "employee":
            continue

        # -------------------------
        # Super Admin
        # -------------------------

        if current_user["role"] == "super_admin":

            pass

        # -------------------------
        # Company Admin
        # -------------------------

        elif current_user["role"] == "company_admin":

            if row[4] != current_user["company_id"]:
                continue

        # -------------------------
        # Department Head
        # -------------------------

        elif current_user["role"] == "department_head":

            if row[6] != current_user["department_id"]:
                continue

        # -------------------------
        # Employee
        # -------------------------

        else:

            raise HTTPException(
                status_code=403,
                detail="Permission denied."
            )

        users.append({

            "id": row[0],

            "name": row[1],

            "email": row[2],

            "role": row[3],

            "company_id": row[4],
            "company": row[5],

            "department_id": row[6],
            "department": row[7],

            "created_at": row[8],
            "progress": get_user_progress(row[0]),
            

        })

    return users

@app.get("/api/company-admins")
async def get_company_admins_api(
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "super_admin":

        raise HTTPException(
            status_code=403,
            detail="Only Super Admin can view Company Admins."
        )

    rows = get_all_users()

    company_admins = []

    for row in rows:

        if row[3] != "company_admin":
            continue

        company_admins.append({

            "id": row[0],
            "name": row[1],
            "email": row[2],
            "company_id": row[4],
            "company": row[5] or "No company",
            "created_at": row[8],

        })

    return company_admins


@app.delete("/api/company-admins/{user_id}")
async def delete_company_admin_api(
    user_id: int,
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "super_admin":

        raise HTTPException(
            status_code=403,
            detail="Only Super Admin can delete Company Admins."
        )

    target_user = get_user_by_id(user_id)

    if not target_user:

        raise HTTPException(
            status_code=404,
            detail="Company Admin not found."
        )

    if target_user[4] != "company_admin":

        raise HTTPException(
            status_code=400,
            detail="Selected user is not a Company Admin."
        )

    try:

        deleted = delete_company_admin(user_id)

    except Exception as exc:

        print(
            "Company Admin deletion failed:",
            exc
        )

        raise HTTPException(
            status_code=409,
            detail=(
                "Company Admin could not be deleted because "
                "related database records depend on this account."
            )
        )

    if not deleted:

        raise HTTPException(
            status_code=404,
            detail="Company Admin not found."
        )

    return {
        "success": True,
        "message": "Company Admin deleted permanently."
    }


@app.get("/api/department-heads")
async def get_department_heads_api(
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "company_admin":
        raise HTTPException(
            status_code=403,
            detail="Only Company Admin can view Department Heads."
        )

    rows = get_all_users(
        current_user["company_id"]
    )

    return [
        {
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "department_id": row[6],
            "department": row[7] or "No department",
            "created_at": row[8],
        }
        for row in rows
        if row[3] == "department_head"
    ]


@app.delete("/api/department-heads/{user_id}")
async def delete_department_head_api(
    user_id: int,
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "company_admin":
        raise HTTPException(
            status_code=403,
            detail="Only Company Admin can delete Department Heads."
        )

    target_user = get_user_by_id(user_id)

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="Department Head not found."
        )

    if target_user[4] != "department_head":
        raise HTTPException(
            status_code=400,
            detail="Selected user is not a Department Head."
        )

    if target_user[5] != current_user["company_id"]:
        raise HTTPException(
            status_code=403,
            detail="You cannot delete a Department Head from another company."
        )

    try:
        deleted = delete_department_head(user_id)
    except Exception as exc:
        print("Department Head deletion failed:", exc)
        raise HTTPException(
            status_code=409,
            detail="Department Head could not be deleted because related database records depend on this account."
        )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Department Head not found."
        )

    return {
        "success": True,
        "message": "Department Head deleted permanently."
    }


@app.post("/api/enrollments")
async def assign_course_api(
    data: EnrollmentCreate,
    current_user=Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):

    # ---------------------------------
    # LOAD TARGET USER
    # ---------------------------------

    user = get_user_by_id(data.user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    # ---------------------------------
    # SUPER ADMIN
    # Can assign any course
    # ---------------------------------

    if current_user["role"] == "super_admin":

        pass

    # ---------------------------------
    # COMPANY ADMIN
    # Can assign only inside own company
    # ---------------------------------

    elif current_user["role"] == "company_admin":

        if user[4] != "employee":
            raise HTTPException(
                status_code=400,
                detail="Courses can only be assigned to employees."
            )

        if user[5] != current_user["company_id"]:

            raise HTTPException(
                status_code=403,
                detail="Cannot assign courses outside your company."
            )

    # ---------------------------------
    # DEPARTMENT HEAD
    # Can assign only inside own department
    # ---------------------------------

    elif current_user["role"] == "department_head":

        if user[4] != "employee":
            raise HTTPException(
                status_code=400,
                detail="Courses can only be assigned to employees."
            )

        if user[6] != current_user["department_id"]:

            raise HTTPException(
                status_code=403,
                detail="Cannot assign courses outside your department."
            )

    # ---------------------------------
    # EMPLOYEE
    # ---------------------------------

    else:

        raise HTTPException(
            status_code=403,
            detail="Permission denied."
        )

    # ---------------------------------
    # VERIFY COURSE
    # ---------------------------------

    if current_user["role"] == "super_admin":

        course = get_course(data.course_id)

        if not course:
            raise HTTPException(
                status_code=404,
                detail="Course not found."
            )

    else:

        company_id = current_user.get("company_id")

        if company_id is None:
            raise HTTPException(
                status_code=403,
                detail="Company information is missing."
            )

        course = get_course(
            data.course_id,
            company_id=company_id
        )

        if not course:
            raise HTTPException(
                status_code=403,
                detail="This course does not belong to your company."
            )

    # ---------------------------------
    # ASSIGN COURSE
    # ---------------------------------

    assign_course(
        user_id=data.user_id,
        course_id=data.course_id
    )

    # ---------------------------------
    # COURSE ASSIGNMENT EMAIL
    # ---------------------------------

    target_company_id = course[5]

    notification_settings = get_notification_settings(
        target_company_id
    )

    if notification_settings["course_assignment_email"]:

        from services.email_service import (
            send_course_assignment_email
        )

        course_url = (
            f"{FRONTEND_URL.rstrip('/')}"
            f"/learning/{data.course_id}"
        )

        email_args = (
            user[2],
            user[1] or "Learner",
            course[1] or "your new course",
            course_url,
        )

        if background_tasks is not None:
            background_tasks.add_task(
                send_course_assignment_email,
                *email_args,
            )
        else:
            send_course_assignment_email(
                *email_args
            )

    return {
        "success": True,
        "email_notification": bool(
            notification_settings["course_assignment_email"]
        )
    }


@app.get("/api/users/{user_id}/courses")
async def get_user_courses_api(
    user_id: int,
    current_user=Depends(get_current_user)
):

    # Super Admin
    if current_user["role"] == "super_admin":

        return get_user_courses(user_id)

    user = get_user_by_id(user_id)

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    # Company Admin
    if current_user["role"] == "company_admin":

        if user[5] != current_user["company_id"]:

            raise HTTPException(
                status_code=403,
                detail="Permission denied."
            )

    # Department Head
    elif current_user["role"] == "department_head":

        if user[6] != current_user["department_id"]:

            raise HTTPException(
                status_code=403,
                detail="Permission denied."
            )

    # Employee
    elif current_user["role"] == "employee":

        if user_id != current_user["user_id"]:

            raise HTTPException(
                status_code=403,
                detail="Permission denied."
            )

    return get_user_courses(user_id)


@app.put("/api/courses/{course_id}")
async def update_course_api(
    course_id: int,
    data: CourseCreate,
    current_user=Depends(get_current_user)
):

    if current_user["role"] not in [
        "super_admin",
        "company_admin"
    ]:

        raise HTTPException(
            status_code=403,
            detail="Permission denied."
        )

    update_course(
        course_id=course_id,
        title=data.title,
        description=data.description,
        thumbnail_url=data.thumbnail_url
    )

    return {
        "success": True
    }

@app.delete("/api/courses/{course_id}")
async def delete_course_api(
    course_id: int,
    current_user=Depends(get_current_user)
):

    if current_user["role"] not in [
        "super_admin",
        "company_admin"
    ]:

        raise HTTPException(
            status_code=403,
            detail="Permission denied."
        )

    delete_course(course_id)

    return {
        "success": True
    }

# ============================================================
# EMPLOYEE - MY CERTIFICATES
# ============================================================

@app.get("/api/my-certificates")
async def my_certificates(
    current_user=Depends(get_current_user)
):

    user_id = current_user["user_id"]

    certificates = get_user_certificates(
        user_id
    )

    return {
        "success": True,
        "certificates": certificates,
    }


# ============================================================
# GET SINGLE CERTIFICATE
# ============================================================

@app.get("/api/certificates/{certificate_id}")
async def get_single_certificate(
    certificate_id: int,
    current_user=Depends(get_current_user)
):

    certificate = get_certificate(
        certificate_id
    )

    if not certificate:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found."
        )

    user_id = current_user["user_id"]
    role = current_user["role"]
    company_id = current_user.get(
        "company_id"
    )

    # --------------------------------------------------------
    # Employee can access only their own certificate
    # --------------------------------------------------------

    if role == "employee":

        if certificate["user_id"] != user_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this certificate."
            )

    # --------------------------------------------------------
    # Company Admin can access only certificates
    # belonging to their company.
    # --------------------------------------------------------

    elif role == "company_admin":

        if certificate["company_id"] != company_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this certificate."
            )

    # --------------------------------------------------------
    # Department Head
    #
    # For now, company-level certificate access is not enough
    # to determine department membership because the certificate
    # table does not store department_id.
    #
    # So don't expose other users' certificates here yet.
    # --------------------------------------------------------

    elif role == "department_head":

        if certificate["user_id"] != user_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this certificate."
            )

    # Super Admin can access all.

    return {
        "success": True,
        "certificate": certificate,
    }


# ============================================================
# COMPANY ADMIN - COMPANY CERTIFICATES
# ============================================================

@app.get("/api/company-certificates")
async def company_certificates(
    current_user=Depends(get_current_user)
):

    if current_user["role"] not in [
        "company_admin",
        "super_admin",
    ]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied."
        )

    # Super Admin can see all companies only after we add
    # a global certificate endpoint. For now, require a company
    # context for this endpoint.

    company_id = current_user.get(
        "company_id"
    )

    if company_id is None:
        raise HTTPException(
            status_code=400,
            detail="Company ID not available."
        )

    certificates = get_company_certificates(
        company_id
    )

    return {
        "success": True,
        "certificates": certificates,
    }
@app.get("/api/dashboard/stats")
async def dashboard_stats(
    current_user=Depends(get_current_user)
):

    role = current_user["role"]

    company_id = current_user.get("company_id")

    user_id = current_user.get("user_id")


    # ============================================================
    # SUPER ADMIN
    # ============================================================

    if role == "super_admin":

        users_count = get_user_count()

        companies_count = get_company_count()

        stats = get_course_stats()

        files_count = get_file_count()


    # ============================================================
    # COMPANY ADMIN
    # ============================================================

    elif role == "company_admin":

        if company_id is None:
            raise HTTPException(
                status_code=403,
                detail="Company information is missing."
            )

        users_count = get_user_count(
            company_id=company_id
        )

        stats = get_course_stats(
            company_id=company_id
        )

        files_count = get_file_count(
            company_id=company_id
        )


    # ============================================================
    # DEPARTMENT HEAD
    # ============================================================

    elif role == "department_head":

        # Keep the existing dashboard behavior for now.
        # Department-specific optimization can be handled separately
        # without changing the current dashboard semantics.

        all_users = get_all_users()

        users_count = sum(
            1
            for user in all_users
            if user[6] == current_user.get("department_id")
        )

        stats = get_course_stats()

        files_count = get_file_count()


    # ============================================================
    # EMPLOYEE
    # ============================================================

    elif role == "employee":

        users_count = 1

        stats = get_course_stats()

        files_count = get_file_count()


    else:

        raise HTTPException(
            status_code=403,
            detail="Permission denied."
        )


    # ============================================================
    # RESPONSE
    # ============================================================

    return {
        "companies": companies_count if role == "super_admin" else 0,
        "users": users_count,
        "courses": stats["courses"],
        "lessons": stats["lessons"],
        "files": files_count
    }
# ============================================================
# LESSON COMPLETION + CERTIFICATE ISSUANCE
# ============================================================

@app.post("/api/lesson-progress")
async def complete_lesson(
    data: LessonProgressRequest,
    current_user=Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):

    user_id = current_user["user_id"]

    company_id = current_user.get(
        "company_id"
    )


    # ========================================================
    # VERIFY COMPANY
    # ========================================================

    if company_id is None:

        raise HTTPException(
            status_code=403,
            detail=(
                "Your account is not associated "
                "with a company."
            )
        )


    # ========================================================
    # VERIFY COURSE
    # ========================================================

    course = get_course(
        data.course_id
    )

    if not course:

        raise HTTPException(
            status_code=404,
            detail="Course not found."
        )


    course_title = (
        course[1]
        if len(course) > 1
        and course[1]
        else "Course"
    )


    # ========================================================
    # VERIFY LESSON
    # ========================================================

    lessons = get_lessons(
        data.course_id
    )

    lesson_ids = {
        lesson[0]
        for lesson in lessons
    }


    if data.lesson_id not in lesson_ids:

        raise HTTPException(
            status_code=400,
            detail=(
                "Lesson does not belong "
                "to this course."
            )
        )


    # ========================================================
    # MARK LESSON COMPLETE
    # ========================================================

    mark_lesson_complete(
        user_id,
        data.course_id,
        data.lesson_id
    )


    # ========================================================
    # GET UPDATED PROGRESS
    # ========================================================

    progress = get_course_progress(
        user_id,
        data.course_id
    )


    certificate = None


    # ========================================================
    # CHECK COURSE COMPLETION
    # ========================================================

    course_completed = (
        progress["total"] > 0
        and
        progress["completed"]
        >= progress["total"]
    )


    if course_completed:

        # ====================================================
        # GET USER
        # ====================================================

        user = get_user_by_id(
            user_id
        )

        if not user:

            raise HTTPException(
                status_code=404,
                detail="User not found."
            )


        user_name = (
            user[1]
            if len(user) > 1
            and user[1]
            else current_user.get(
                "name",
                "Learner"
            )
        )


        # ====================================================
        # GET COMPANY
        # ====================================================

        company = get_company(
            company_id
        )


        company_name = (
            company[1]
            if company
            and len(company) > 1
            and company[1]
            else "Company"
        )


        # ====================================================
        # GET BRANDING
        # ====================================================

        branding = get_company_branding(
            company_id
        )


        if not isinstance(
            branding,
            dict
        ):
            branding = {}


        logo_url = (
            branding.get(
                "logo_url"
            )
            or ""
        )


        primary_color = (
            branding.get(
                "primary_color"
            )
            or "#FBBF24"
        )


        secondary_color = (
            branding.get(
                "secondary_color"
            )
            or "#0F172A"
        )


        accent_color = (
            branding.get(
                "accent_color"
            )
            or "#F59E0B"
        )


        # ====================================================
        # CREATE CERTIFICATE RECORD
        # ====================================================

        certificate = create_certificate(

            user_id=user_id,

            course_id=data.course_id,

            company_id=company_id,

            user_name=user_name,

            course_title=course_title,

            company_name=company_name,

            logo_url=logo_url,

            primary_color=primary_color,

            secondary_color=secondary_color,

            accent_color=accent_color,

        )


        # ====================================================
        # GENERATE PDF
        # ====================================================

        try:

            pdf_url = generate_certificate_pdf(
                certificate={
                    **certificate,

                    "user_name":
                        user_name,

                    "course_title":
                        course_title,

                    "company_name":
                        company_name,

                    "logo_url":
                        logo_url,

                    "primary_color":
                        primary_color,

                    "secondary_color":
                        secondary_color,

                    "accent_color":
                        accent_color,
                }
            )


            # ==================================================
            # SAVE PDF URL
            # ==================================================

            update_certificate_pdf_url(
                certificate_id=
                    certificate["id"],

                pdf_url=
                    pdf_url
            )


            # Update response object
            certificate["pdf_url"] = (
                pdf_url
            )

            # ------------------------------------------------
            # EMAIL CERTIFICATE TO EMPLOYEE
            # ------------------------------------------------

            notification_settings = get_notification_settings(
                company_id
            )

            if notification_settings["certificate_email"]:

                from services.email_service import (
                    send_certificate_email
                )

                email_args = (
                    user[2],
                    user_name,
                    course_title,
                    pdf_url,
                    certificate.get("certificate_number", ""),
                )

                if background_tasks is not None:
                    background_tasks.add_task(
                        send_certificate_email,
                        *email_args,
                    )
                else:
                    send_certificate_email(
                        *email_args
                    )


        except Exception as exc:

            print(
                "Certificate PDF generation failed:",
                exc
            )

            # /*
            #  * The course is still completed and the
            #  * certificate database record still exists.
            #  *
            #  * PDF generation can be retried later.
            #  */


            certificate["pdf_error"] = (
                "Certificate record created, "
                "but PDF generation failed."
            )


    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "success": True,

        "message": (
            "Course completed and certificate issued."
            if certificate
            else "Lesson marked complete."
        ),

        "progress": progress,

        "certificate": certificate,

    }
@app.get("/api/users/{user_id}/courses/{course_id}/progress")
async def course_progress(
    user_id: int,
    course_id: int,
    current_user=Depends(get_current_user)
):

    if current_user["role"] == "employee":

        user_id = current_user["user_id"]

    elif current_user["role"] == "department_head":

        user = get_user_by_id(user_id)

        if user[6] != current_user["department_id"]:

            raise HTTPException(
                status_code=403,
                detail="Permission denied."
            )

    elif current_user["role"] == "company_admin":

        user = get_user_by_id(user_id)

        if user[5] != current_user["company_id"]:

            raise HTTPException(
                status_code=403,
                detail="Permission denied."
            )

    return get_course_progress(
        user_id,
        course_id
    )

@app.get("/api/users/{user_id}/completed-lessons")
async def completed_lessons(
    user_id: int,
    current_user=Depends(get_current_user)
):

    if current_user["role"] == "employee":

        user_id = current_user["user_id"]

    elif current_user["role"] == "department_head":

        user = get_user_by_id(user_id)

        if user[6] != current_user["department_id"]:

            raise HTTPException(
                status_code=403,
                detail="Permission denied."
            )

    elif current_user["role"] == "company_admin":

        user = get_user_by_id(user_id)

        if user[5] != current_user["company_id"]:

            raise HTTPException(
                status_code=403,
                detail="Permission denied."
            )

    return get_completed_lessons(user_id)

@app.get("/api/admin/analytics")
async def admin_analytics(
    current_user=Depends(get_current_user)
):

    analytics = get_admin_analytics()

    # Super Admin
    if current_user["role"] == "super_admin":
        return analytics

    # Company Admin
    if current_user["role"] == "company_admin":

        return [
            a for a in analytics
            if a["company_id"] == current_user["company_id"]
        ]

    # Department Head
    if current_user["role"] == "department_head":

        return [
            a for a in analytics
            if a["department_id"] == current_user["department_id"]
        ]

    raise HTTPException(
        status_code=403,
        detail="Permission denied."
    )

# ============================================================
# COMPANY BRANDING PERMISSION
# ============================================================

def require_company_admin(current_user):

    if current_user.get("role") != "company_admin":
        raise HTTPException(
            status_code=403,
            detail="Only Company Admin can manage company branding."
        )

    company_id = current_user.get("company_id")

    if company_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not associated with a company."
        )

    return company_id

# ============================================================
# COMPANY NOTIFICATION SETTINGS
# ============================================================

@app.get("/api/company/notification-settings")
async def get_company_notification_settings_api(
    current_user=Depends(get_current_user)
):

    company_id = current_user.get("company_id")

    if current_user["role"] != "company_admin":
        raise HTTPException(
            status_code=403,
            detail="Only Company Admin can manage notification settings."
        )

    if company_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not associated with a company."
        )

    settings_data = get_notification_settings(company_id)

    return {
        "success": True,
        "settings": settings_data,
        "email_delivery_configured": bool(
            os.getenv("SMTP_HOST")
            and os.getenv("SMTP_USERNAME")
            and os.getenv("SMTP_PASSWORD")
        ),
    }


@app.put("/api/company/notification-settings")
async def update_company_notification_settings_api(
    data: NotificationSettingsUpdate,
    current_user=Depends(get_current_user)
):

    company_id = current_user.get("company_id")

    if current_user["role"] != "company_admin":
        raise HTTPException(
            status_code=403,
            detail="Only Company Admin can manage notification settings."
        )

    if company_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not associated with a company."
        )

    settings_data = update_notification_settings(
        company_id=company_id,
        course_assignment_email=data.course_assignment_email,
        certificate_email=data.certificate_email,
    )

    return {
        "success": True,
        "settings": settings_data,
    }


# ============================================================
# GET COMPANY BRANDING
# ============================================================

@app.get("/api/company/branding")
async def get_company_branding_api(
    current_user=Depends(get_current_user)
):

    company_id = current_user.get("company_id")

    if company_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not associated with a company."
        )

    branding = get_company_branding(
        company_id
    )

    if not branding:
        raise HTTPException(
            status_code=404,
            detail="Company branding not found."
        )

    return {
        "success": True,
        "branding": branding
    }

# ============================================================
# UPDATE COMPANY BRANDING
# ============================================================

@app.put("/api/company/branding")
async def update_company_branding_api(
    data: CompanyBrandingUpdate,
    current_user=Depends(get_current_user)
):

    company_id = require_company_admin(
        current_user
    )

    branding = update_company_branding(
        company_id=company_id,
        primary_color=data.primary_color,
        secondary_color=data.secondary_color,
        accent_color=data.accent_color
    )

    return {
        "success": True,
        "branding": branding
    }
# ============================================================
# UPLOAD COMPANY LOGO
# ============================================================

@app.post("/api/company/branding/logo")
async def upload_company_logo(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):

    company_id = require_company_admin(
        current_user
    )

    # --------------------------------------------------------
    # Validate file type
    # --------------------------------------------------------

    allowed_types = {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/svg+xml",
    }

    if file.content_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported logo format. "
                "Use PNG, JPG, WEBP or SVG."
            )
        )

    # --------------------------------------------------------
    # Read file
    # --------------------------------------------------------

    contents = await file.read()

    if not contents:

        raise HTTPException(
            status_code=400,
            detail="Empty logo file."
        )

    # 5 MB maximum

    if len(contents) > 5 * 1024 * 1024:

        raise HTTPException(
            status_code=400,
            detail="Logo must be smaller than 5 MB."
        )

    try:

        # ----------------------------------------------------
        # Upload to Cloudinary
        # ----------------------------------------------------

        result = cloudinary.uploader.upload(
            contents,
            folder="lms/company_logos",
            resource_type="image",
            overwrite=True,
        )

        logo_url = result.get(
            "secure_url",
            ""
        )

        public_id = result.get(
            "public_id",
            ""
        )

        if not logo_url:

            raise HTTPException(
                status_code=500,
                detail="Cloudinary did not return a logo URL."
            )

        # ----------------------------------------------------
        # Save URL in company record
        # ----------------------------------------------------

        branding = update_company_branding(
            company_id=company_id,
            logo_url=logo_url,
            logo_public_id=public_id
        )

        return {
            "success": True,
            "branding": branding
        }

    except HTTPException:
        raise

    except Exception as exc:

        print(
            "Company logo upload failed:",
            exc
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to upload company logo."
        )
@app.post("/api/companies")
async def create_company_api(
    data: CompanyCreate,
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "super_admin":

        raise HTTPException(
            status_code=403,
            detail="Only Super Admin can create companies."
        )

    try:
        company_id = create_company(
            company_name=data.company_name,
            company_email=data.company_email,
            company_phone=data.company_phone,
            company_address=data.company_address
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc)
        )

    return {
        "success": True,
        "company_id": company_id
    }

@app.get("/api/companies")
async def get_companies_api(
    current_user=Depends(get_current_user)
):

    rows = get_companies()

    companies = []

    for row in rows:

        if current_user["role"] == "company_admin":

            if row[0] != current_user["company_id"]:
                continue

        companies.append({

            "id": row[0],
            "company_name": row[1],
            "company_email": row[2],
            "company_phone": row[3],
            "company_address": row[4],
            "status": row[5],
            "employee_count": row[-1] or 0

        })

    return companies


@app.get("/api/companies/{company_id}")
async def get_company_api(company_id: int):

    row = get_company(company_id)

    if not row:

        return {
            "success": False,
            "message": "Company not found"
        }

    return {

        "id": row[0],

        "company_name": row[1],

        "company_email": row[2],

        "company_phone": row[3],

        "company_address": row[4],

        "status": row[5],

        "created_at": row[6]

    }


@app.put("/api/companies/{company_id}")
async def update_company_api(
    company_id: int,
    data: CompanyUpdate,
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "super_admin":

        raise HTTPException(
            status_code=403,
            detail="Only Super Admin can update companies."
        )

    update_company(
        company_id,
        data.company_name,
        data.company_email,
        data.company_phone,
        data.company_address,
        data.status
    )

    return {
        "success": True
    }
@app.delete("/api/companies/{company_id}")
async def delete_company_api(
    company_id: int,
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "super_admin":

        raise HTTPException(
            status_code=403,
            detail="Only Super Admin can delete companies."
        )

    delete_company(company_id)

    return {
        "success": True
    }

@app.post("/api/departments")
async def create_department_api(
    data: DepartmentCreate,
    current_user = Depends(get_current_user)
):

    # ---------------------------------
    # SUPER ADMIN
    # Can create department for any company
    # ---------------------------------

    if current_user["role"] == "super_admin":

        company_id = data.company_id

    # ---------------------------------
    # COMPANY ADMIN
    # Only for own company
    # ---------------------------------

    elif current_user["role"] == "company_admin":

        company_id = current_user["company_id"]

    # ---------------------------------
    # Others cannot create departments
    # ---------------------------------

    else:

        raise HTTPException(
            status_code=403,
            detail="Permission denied."
        )

    department_id = create_department(
        company_id,
        data.department_name
    )

    return {
        "success": True,
        "department_id": department_id
    }
@app.get("/api/companies/{company_id}/departments")
async def get_departments_api(
    company_id: int,
    current_user=Depends(get_current_user)
):

    if current_user["role"] == "company_admin":

        company_id = current_user["company_id"]

    elif current_user["role"] == "department_head":

        company_id = current_user["company_id"]

    rows = get_departments(company_id)

    departments = []

    for row in rows:

        departments.append({

            "id": row[0],
            "company_id": row[1],
            "department_name": row[2]

        })

    return departments

@app.delete("/api/departments/{department_id}")
async def delete_department_api(
    department_id: int,
    current_user=Depends(get_current_user)
):

    if current_user["role"] not in [
        "super_admin",
        "company_admin"
    ]:

        raise HTTPException(
            status_code=403,
            detail="Permission denied."
        )

    delete_department(department_id)

    return {
        "success": True
    }
