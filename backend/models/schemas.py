from pydantic import BaseModel
from typing import List, Optional


# -----------------------------
# REQUEST MODEL
# -----------------------------
class ChatRequest(BaseModel):
    message: str
    session_id: str
    mode: Optional[str] = "normal"


# -----------------------------
# SOURCE MODEL (FIXED)
# -----------------------------
class SourceItem(BaseModel):
    type: str

    # video
    video: Optional[str] = None
    video_url: Optional[str] = None
    start: Optional[float] = None
    end: Optional[float] = None

    # document
    source: Optional[str] = None
    page: Optional[int] = None


# -----------------------------
# RESPONSE MODEL
# -----------------------------
class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceItem]

# ===================================
# LMS - COURSES
# ===================================

class CourseCreate(BaseModel):
    title: str
    description: str
    thumbnail_url: str = ""


class CourseResponse(BaseModel):
    id: int
    title: str
    description: str
    thumbnail_url: str


# ===================================
# LMS - LESSONS
# ===================================

class LessonCreate(BaseModel):
    course_id: int

    title: str

    content_type: str
    content_url: str

    lesson_order: int    

# ===================================
# AUTH
# ===================================

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str = "employee"
    company_id: Optional[int] = None
    department_id: Optional[int] = None
    company_name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str   

class CompanyCreate(BaseModel):

    company_name: str

    company_email: str

    company_phone: str

    company_address: str


class CompanyUpdate(BaseModel):

    company_name: str

    company_email: str

    company_phone: str

    company_address: str

    status: str

class EnrollmentCreate(BaseModel):
    user_id: int
    course_id: int    

class LessonProgressRequest(BaseModel):
    user_id: int
    course_id: int
    lesson_id: int    

class DepartmentCreate(BaseModel):

    company_id: int

    department_name: str    

# ===================================
# COMPANY BRANDING
# ===================================

class CompanyBrandingUpdate(BaseModel):

    primary_color: Optional[str] = None

    secondary_color: Optional[str] = None

    accent_color: Optional[str] = None


class CompanyBrandingResponse(BaseModel):

    company_id: int

    logo_url: str

    logo_public_id: str

    primary_color: str

    secondary_color: str

    accent_color: str    