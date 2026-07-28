from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, Text
from app.database import Base


class AdminModel(Base):
    """
    SQLAlchemy model representing a Mandal Administrator or Super Admin account.
    Supports Role-Based Access Control (RBAC), Invite Token flows, account lockout, and OTP reset.
    """
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    username = Column(String, unique=True, nullable=True, index=True)  # Nullable until invite accepted
    phone_number = Column(String, nullable=False)
    email = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)  # Nullable until invite accepted
    role = Column(String, default="admin", nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)  # Inactive until invite accepted
    is_deleted = Column(Boolean, default=False, nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)

    # Invite Token Flow
    invite_token = Column(String, unique=True, nullable=True, index=True)
    invite_expires_at = Column(DateTime, nullable=True)

    # Security & Audit tracking
    last_login = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    account_locked_until = Column(DateTime, nullable=True)

    # OTP for WhatsApp Password Reset
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(String, nullable=True)


class SettingsModel(Base):
    """
    SQLAlchemy model for storing dynamic Mandal configuration parameters.
    Ensures committee members can update contact info & templates without modifying code.
    """
    __tablename__ = "mandal_settings"

    id = Column(Integer, primary_key=True, default=1)
    mandal_name = Column(String, default="Shyam Bhajan Seva Mandal", nullable=False)
    whatsapp_contact = Column(String, default="+919876543210", nullable=False)
    admin_notification_numbers = Column(Text, default="whatsapp:+919876543210", nullable=False)
    booking_auto_reply_template = Column(
        Text,
        default="🙏 *Jai Shree Shyam!*\n\nThank you for booking Bhajan Sandhya. Our team will contact you shortly.",
        nullable=False
    )
    website_contact_numbers = Column(String, default="+919876543210", nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class AuditLogModel(Base):
    """
    SQLAlchemy model for recording security & administrative action audit trails.
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    user_username = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    ip_address = Column(String, default="127.0.0.1")
    user_agent = Column(String, default="Unknown")


class BookingModel(Base):
    """
    SQLAlchemy model representing a Bhajan Sandhya event booking request.
    """
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    alt_phone = Column(String, nullable=True)
    booking_date = Column(Date, unique=True, nullable=False)
    status = Column(String, default="Pending")


class MandalMemberModel(Base):
    """
    SQLAlchemy model representing an active Mandal performer or team member.
    """
    __tablename__ = "mandal_members"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    role = Column(String, nullable=False)
