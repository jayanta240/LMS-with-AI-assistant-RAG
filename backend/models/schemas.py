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
    source_url: Optional[str] = None
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
    department_head_id: Optional[int] = None
    employee_id: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    profile_photo_url: Optional[str] = None
    mobile_number: Optional[str] = None
    employment_type: Optional[str] = None
    employment_status: Optional[str] = None
    date_of_joining: Optional[str] = None
    date_of_confirmation: Optional[str] = None
    date_of_exit: Optional[str] = None
    designation: Optional[str] = None
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


class NotificationSettingsUpdate(BaseModel):

    course_assignment_email: bool = True
    certificate_email: bool = True

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