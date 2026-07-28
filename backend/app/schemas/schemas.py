from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel


# ── ADMIN SCHEMAS ─────────────────────────────────────────────────────────────

class AdminCreate(BaseModel):
    """Schema for Super Admin adding a new Admin account."""
    full_name: str
    phone_number: str
    email: Optional[str] = None
    role: str = "admin"


class AdminInviteRequest(BaseModel):
    """Schema for inviting a new Admin via WhatsApp invite link."""
    full_name: str
    phone_number: str
    email: Optional[str] = None
    role: str = "admin"


class AdminInviteResponse(BaseModel):
    """Returned when a new Admin invite token is generated."""
    invite_link: str
    token: str
    message: str


class AcceptInviteRequest(BaseModel):
    """Schema for an invited Admin setting up their username and password."""
    token: str
    username: str
    password: str


class AdminUpdate(BaseModel):
    """Schema for Super Admin modifying an existing Admin account."""
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AdminResponse(BaseModel):
    """Schema for returning Admin account details."""
    id: int
    full_name: str
    username: Optional[str] = None
    phone_number: str
    email: Optional[str] = None
    role: str
    is_active: bool
    must_change_password: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    created_by: Optional[str] = None

    model_config = {"from_attributes": True}


# ── SETTINGS SCHEMAS ──────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    """Schema for Super Admin updating dynamic Mandal settings."""
    mandal_name: Optional[str] = None
    whatsapp_contact: Optional[str] = None
    admin_notification_numbers: Optional[str] = None
    booking_auto_reply_template: Optional[str] = None
    website_contact_numbers: Optional[str] = None


class SettingsResponse(BaseModel):
    """Schema for returning Mandal settings."""
    id: int
    mandal_name: str
    whatsapp_contact: str
    admin_notification_numbers: str
    booking_auto_reply_template: str
    website_contact_numbers: str
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── AUTH SCHEMAS ──────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Schema for incoming login request."""
    username: str
    password: str


class LoginResponse(BaseModel):
    """Schema for login output."""
    message: str
    must_change_password: bool
    role: str
    username: str


class ChangePasswordRequest(BaseModel):
    """Schema for changing password."""
    current_password: Optional[str] = None
    new_password: str


class ForgotPasswordRequest(BaseModel):
    """Schema for requesting a WhatsApp OTP password reset."""
    username: str


class VerifyOTPRequest(BaseModel):
    """Schema for verifying WhatsApp OTP and setting new password."""
    username: str
    otp_code: str
    new_password: str


# ── AUDIT LOG SCHEMAS ─────────────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    """Schema for returned audit trail entries."""
    id: int
    timestamp: datetime
    user_username: str
    action: str
    details: str
    ip_address: str
    user_agent: str

    model_config = {"from_attributes": True}


# ── BOOKING & MEMBER SCHEMAS ──────────────────────────────────────────────────

class BookingCreate(BaseModel):
    """Schema for incoming booking creation payload."""
    full_name: str
    address: str
    phone: str
    alt_phone: Optional[str] = None
    booking_date: date


class BookingResponse(BookingCreate):
    """Schema for returned booking objects."""
    id: int
    status: str

    model_config = {"from_attributes": True}


class MemberCreate(BaseModel):
    """Schema for adding a new Mandal member."""
    name: str
    phone: str
    role: str


class MemberResponse(MemberCreate):
    """Schema for returned Mandal member objects."""
    id: int

    model_config = {"from_attributes": True}
