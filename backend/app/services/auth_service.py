import logging
from datetime import datetime, timedelta
from typing import Tuple, Dict, Any
from fastapi import HTTPException, status, BackgroundTasks, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import AdminModel
from app.repositories.admin_repository import AdminRepository
from app.repositories.audit_repository import AuditRepository
from app.auth.dependencies import create_access_token, create_refresh_token
from app.utils.security import (
    verify_password,
    hash_password,
    validate_password_strength,
    generate_otp,
)
from app.services.whatsapp_service import send_otp_task

logger = logging.getLogger("auth_service")


class AuthService:
    """Business logic service handling login authentication, security lockouts, OTP, and password updates."""

    @staticmethod
    def authenticate_admin(
        db: Session,
        username: str,
        password: str,
        response: Response,
        ip_address: str = "127.0.0.1",
        user_agent: str = "Unknown"
    ) -> Dict[str, Any]:
        """
        Authenticate admin login credentials.
        - Enforces 5 failed attempts -> 15-minute account lockout.
        - Detects `must_change_password` first-time login status.
        - Generates JWT Access & Refresh Tokens.
        """
        clean_username = username.strip()
        admin = AdminRepository.get_by_username(db, clean_username)

        # 1. Unknown Username
        if not admin:
            AuditRepository.log_action(
                db,
                username=clean_username,
                action="LOGIN_FAILED",
                details="Attempted login with unregistered username",
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password."
            )

        # 2. Deactivated Account Check
        if not admin.is_active:
            AuditRepository.log_action(
                db,
                username=clean_username,
                action="LOGIN_BLOCKED",
                details="Attempted login to deactivated account",
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your admin account is currently deactivated. Please contact Super Admin."
            )

        # 3. Lockout Verification
        now = datetime.utcnow()
        if admin.account_locked_until and admin.account_locked_until > now:
            remaining_mins = int((admin.account_locked_until - now).total_seconds() / 60) + 1
            AuditRepository.log_action(
                db,
                username=clean_username,
                action="LOGIN_LOCKED",
                details=f"Account locked. {remaining_mins} minutes remaining",
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account locked due to consecutive failed attempts. Try again in {remaining_mins} minutes."
            )

        # 4. Password Match Verification
        if not verify_password(password, admin.password_hash):
            admin.failed_login_attempts += 1
            
            # Lockout triggering
            if admin.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
                admin.account_locked_until = now + timedelta(minutes=settings.ACCOUNT_LOCKOUT_MINUTES)
                AdminRepository.update(db, admin)
                AuditRepository.log_action(
                    db,
                    username=clean_username,
                    action="ACCOUNT_LOCKED",
                    details=f"Locked out after {admin.failed_login_attempts} consecutive failed attempts",
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"Account locked for {settings.ACCOUNT_LOCKOUT_MINUTES} minutes due to 5 failed login attempts."
                )
            else:
                AdminRepository.update(db, admin)
                attempts_left = settings.MAX_FAILED_LOGIN_ATTEMPTS - admin.failed_login_attempts
                AuditRepository.log_action(
                    db,
                    username=clean_username,
                    action="LOGIN_FAILED",
                    details=f"Incorrect password. {attempts_left} attempts remaining",
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid username or password. {attempts_left} attempt(s) remaining before lockout."
                )

        # 5. Successful Authentication
        admin.failed_login_attempts = 0
        admin.account_locked_until = None
        admin.last_login = now
        AdminRepository.update(db, admin)

        # Generate JWT Tokens
        payload = {"username": admin.username, "role": admin.role, "id": admin.id}
        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        # Set Cookies (samesite="none" & secure=True required for cross-site Vercel <-> Render cookies)
        response.set_cookie(
            key="admin_session",
            value=access_token,
            httponly=True,
            samesite="none",
            secure=True
        )
        response.set_cookie(
            key="admin_refresh",
            value=refresh_token,
            httponly=True,
            samesite="none",
            secure=True
        )

        AuditRepository.log_action(
            db,
            username=admin.username,
            action="LOGIN_SUCCESS",
            details=f"Logged in successfully as {admin.role}",
            ip_address=ip_address,
            user_agent=user_agent
        )

        return {
            "message": "Authentication successful",
            "must_change_password": False if admin.role == "super_admin" else admin.must_change_password,
            "role": admin.role,
            "username": admin.username,
            "access_token": access_token
        }

    @staticmethod
    def change_password(
        db: Session,
        admin: AdminModel,
        new_password: str,
        current_password: str = None,
        ip_address: str = "127.0.0.1"
    ) -> None:
        """
        Enforce password strength rules and update admin password.
        Clears `must_change_password` flag upon completion.
        """
        # Validate current password if provided
        if current_password and not verify_password(current_password, admin.password_hash):
            raise HTTPException(status_code=400, detail="Current password supplied is incorrect.")

        # Enforce password strength criteria
        validate_password_strength(new_password)

        admin.password_hash = hash_password(new_password)
        admin.must_change_password = False
        AdminRepository.update(db, admin)

        AuditRepository.log_action(
            db,
            username=admin.username,
            action="PASSWORD_CHANGED",
            details="Successfully updated account password",
            ip_address=ip_address
        )

    @staticmethod
    def request_whatsapp_otp(
        db: Session,
        username: str,
        background_tasks: BackgroundTasks,
        ip_address: str = "127.0.0.1"
    ) -> None:
        """
        Generate 6-digit WhatsApp OTP for password reset (5 minute expiration).
        """
        admin = AdminRepository.get_by_username(db, username.strip())
        if not admin:
            # Silent return to prevent username enumeration attacks
            return

        if not admin.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated. Contact Super Admin.")

        otp = generate_otp()
        admin.otp_code = otp
        admin.otp_expires_at = datetime.utcnow() + timedelta(minutes=5)
        AdminRepository.update(db, admin)

        AuditRepository.log_action(
            db,
            username=admin.username,
            action="OTP_REQUESTED",
            details="Requested WhatsApp OTP for password reset",
            ip_address=ip_address
        )

        # Queue WhatsApp OTP dispatch
        background_tasks.add_task(
            send_otp_task,
            to_number=admin.phone_number,
            username=admin.username,
            otp_code=otp
        )

    @staticmethod
    def verify_otp_and_reset(
        db: Session,
        username: str,
        otp_code: str,
        new_password: str,
        ip_address: str = "127.0.0.1"
    ) -> None:
        """Verify WhatsApp OTP code and reset password."""
        admin = AdminRepository.get_by_username(db, username.strip())
        if not admin or not admin.otp_code or admin.otp_code != otp_code.strip():
            raise HTTPException(status_code=400, detail="Invalid OTP verification code.")

        if admin.otp_expires_at and admin.otp_expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP.")

        validate_password_strength(new_password)

        admin.password_hash = hash_password(new_password)
        admin.must_change_password = False
        admin.otp_code = None
        admin.otp_expires_at = None
        admin.failed_login_attempts = 0
        admin.account_locked_until = None
        AdminRepository.update(db, admin)

        AuditRepository.log_action(
            db,
            username=admin.username,
            action="PASSWORD_RESET_VIA_OTP",
            details="Successfully reset password using WhatsApp OTP",
            ip_address=ip_address
        )
