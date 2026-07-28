from fastapi import APIRouter, Depends, HTTPException, Request, Response, BackgroundTasks, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import AdminModel
from app.schemas.schemas import (
    LoginRequest,
    LoginResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    VerifyOTPRequest,
    AdminResponse,
)
from app.services.auth_service import AuthService
from app.auth.dependencies import get_current_admin

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticate admin credentials.
    Enforces 5 failed attempts -> 15-minute account lockout.
    Detects `must_change_password` first-time login status.
    Sets httpOnly session cookies.
    """
    ip_address = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")

    result = AuthService.authenticate_admin(
        db=db,
        username=data.username,
        password=data.password,
        response=response,
        ip_address=ip_address,
        user_agent=user_agent
    )
    return result


@router.post("/logout")
def logout(response: Response):
    """Clear admin session cookies."""
    response.delete_cookie(key="admin_session")
    response.delete_cookie(key="admin_refresh")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=AdminResponse)
def get_current_user_profile(current_admin: AdminModel = Depends(get_current_admin)):
    """Retrieve logged-in admin's profile data."""
    return current_admin


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    request: Request,
    current_admin: AdminModel = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Update logged-in admin's password.
    Enforces minimum password security rules and resets `must_change_password = False`.
    """
    ip_address = request.client.host if request.client else "127.0.0.1"
    AuthService.change_password(
        db=db,
        admin=current_admin,
        new_password=data.new_password,
        current_password=data.current_password,
        ip_address=ip_address
    )
    return {"message": "Password changed successfully. You may now access all features."}


@router.post("/forgot-password")
def request_forgot_password_otp(
    data: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Generate and send 6-digit WhatsApp OTP for password reset.
    """
    ip_address = request.client.host if request.client else "127.0.0.1"
    AuthService.request_whatsapp_otp(
        db=db,
        username=data.username,
        background_tasks=background_tasks,
        ip_address=ip_address
    )
    return {"message": "If the username exists, a 6-digit OTP has been sent via WhatsApp."}


@router.post("/verify-otp")
def verify_otp_and_reset(
    data: VerifyOTPRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Verify WhatsApp OTP code and set a new password.
    """
    ip_address = request.client.host if request.client else "127.0.0.1"
    AuthService.verify_otp_and_reset(
        db=db,
        username=data.username,
        otp_code=data.otp_code,
        new_password=data.new_password,
        ip_address=ip_address
    )
    return {"message": "Password reset successfully. You may now log in with your new password."}
