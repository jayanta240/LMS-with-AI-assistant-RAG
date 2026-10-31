from pydantic import BaseModel, Field
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
    category: Optional[str] = None
    sub_category: Optional[str] = None
    level: Optional[str] = None
    course_code: Optional[str] = None
    language: Optional[str] = None
    duration: Optional[str] = None
    course_type: str = "online"
    visibility: str = "private"
    tags: List[str] = Field(default_factory=list)
    learning_outcomes: List[str] = Field(default_factory=list)
    release_date: Optional[str] = None
    expiry_date: Optional[str] = None
    status: str = "draft"
    visible_department_ids: Optional[List[int]] = None


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
    industry_type: str
    company_type: Optional[str] = None
    gst_number: Optional[str] = None
    cin_number: Optional[str] = None
    company_description: Optional[str] = None

    contact_person_name: str
    contact_designation: str
    contact_email: str
    contact_mobile: str

    admin_name: str
    admin_email: str
    admin_password: str
    admin_mobile: Optional[str] = None

    address_line_1: str
    address_line_2: Optional[str] = None
    city: str
    state: str
    country: str
    pin_code: str

    plan_name: str
    license_type: str
    start_date: str
    expiry_date: str
    trial: bool = False
    max_active_users: int = Field(..., ge=1)
    max_courses: Optional[int] = Field(default=None, ge=0)
    storage_limit: Optional[str] = None
    billing_cycle: Optional[str] = None


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