from datetime import date
from typing import Optional
from pydantic import BaseModel


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


class LoginRequest(BaseModel):
    """Schema for admin authentication login."""
    username: str
    password: str


class AdminCreate(BaseModel):
    """Schema for registering a new admin user."""
    username: str
    password: str
    name: str
