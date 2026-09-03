import secrets
import logging
from datetime import datetime, timedelta
from typing import Tuple, Optional
from fastapi import HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import AdminModel
from app.repositories.admin_repository import AdminRepository
from app.repositories.audit_repository import AuditRepository
from app.schemas.schemas import (
    AdminInviteRequest,
    AdminInviteResponse,
    AcceptInviteRequest,
    AdminUpdate,
    AdminResponse,
)
from app.utils.security import (
    hash_password,
    validate_password_strength,
)
from app.services.whatsapp_service import send_invite_link_task

logger = logging.getLogger("admin_service")


class AdminService:
    """Business logic service handling Super Admin account lifecycle, invite links, and RBAC modifications."""

    @staticmethod
    def ensure_initial_super_admin(db: Session, default_username: str, default_hash: Optional[str]) -> AdminModel:
        """
        Seed initial Super Admin account if database is empty.
        """
        existing = AdminRepository.get_by_username(db, default_username)
        if existing:
            if existing.must_change_password:
                existing.must_change_password = False
                db.commit()
            return existing

        master_admin = AdminModel(
            full_name="Master Mandal Admin",
            username=default_username,
            phone_number="+919876543210",
            email="admin@shyambhajan.com",
            password_hash=hash_password("Shyam@2026"),
            role="super_admin",
            is_active=True,
            must_change_password=False,
            created_by="System Initializer"
        )
        return AdminRepository.create(db, master_admin)

    @staticmethod
    def create_admin_invite(
        db: Session,
        data: AdminInviteRequest,
        creator_admin: AdminModel,
        background_tasks: BackgroundTasks,
        ip_address: str = "127.0.0.1"
    ) -> AdminInviteResponse:
        """
        Create a pending Admin record and dispatch a WhatsApp Invite Link.
        Flow: Super Admin -> Create Admin -> Generate Invite Token -> WhatsApp Link -> Admin sets username & password.
        """
        if data.role == "super_admin" and creator_admin.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admin can issue invitations for Super Admin accounts."
            )

        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=24)

        invited_admin = AdminModel(
            full_name=data.full_name.strip(),
            phone_number=data.phone_number.strip(),
            email=data.email.strip() if data.email else None,
            role=data.role,
            is_active=False,  # Pending invite acceptance
            must_change_password=False,
            invite_token=token,
            invite_expires_at=expires_at,
            created_by=creator_admin.username
        )

        saved_admin = AdminRepository.create(db, invited_admin)

        # Base URL for Next.js frontend invite acceptance page
        base_panel_url = settings.ADMIN_PANEL_URL.rstrip('/')
        if "localhost" in base_panel_url:
            base_panel_url = "https://shreenishanyatraparivar.vercel.app/admin"
        invite_link = f"{base_panel_url}/accept-invite?token={token}"

        AuditRepository.log_action(
            db,
            username=creator_admin.username,
            action="ADMIN_INVITE_SENT",
            details=f"Sent WhatsApp invite link for {data.role} account to {data.full_name}",
            ip_address=ip_address
        )

        # Queue WhatsApp message
        background_tasks.add_task(
            send_invite_link_task,
            to_number=saved_admin.phone_number,
            full_name=saved_admin.full_name,
            invite_link=invite_link
        )

        return AdminInviteResponse(
            invite_link=invite_link,
            token=token,
            message=f"Invite link generated and queued for WhatsApp delivery to {saved_admin.phone_number}."
        )

    @staticmethod
    def accept_admin_invite(
        db: Session,
        data: AcceptInviteRequest,
        ip_address: str = "127.0.0.1"
    ) -> AdminResponse:
        """
        Invited admin clicks link on WhatsApp, sets their username & creates their own password.
        """
        clean_token = data.token.strip()
        admin = db.query(AdminModel).filter(
            AdminModel.invite_token == clean_token,
            AdminModel.is_deleted == False
        ).first()

        if not admin:
            raise HTTPException(status_code=400, detail="Invalid or expired invitation token.")

        if admin.invite_expires_at and admin.invite_expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Invitation link has expired. Request a new invite from Super Admin.")

        # Check username uniqueness
        clean_username = data.username.strip().lower()
        existing = AdminRepository.get_by_username(db, clean_username)
        if existing and existing.id != admin.id:
            raise HTTPException(status_code=400, detail="Username is already taken. Please choose another username.")

        # Enforce password policy
        validate_password_strength(data.password)

        admin.username = clean_username
        admin.password_hash = hash_password(data.password)
        admin.is_active = True
        admin.must_change_password = False
        admin.invite_token = None
        admin.invite_expires_at = None

        updated_admin = AdminRepository.update(db, admin)

        AuditRepository.log_action(
            db,
            username=clean_username,
            action="ADMIN_INVITE_ACCEPTED",
            details=f"Admin '{clean_username}' completed account setup via WhatsApp invite link.",
            ip_address=ip_address
        )

        return AdminResponse.model_validate(updated_admin)

    @staticmethod
    def update_admin(
        db: Session,
        admin_id: int,
        data: AdminUpdate,
        updater_admin: AdminModel,
        ip_address: str = "127.0.0.1"
    ) -> AdminResponse:
        """Update an existing Admin account's role or details."""
        target_admin = AdminRepository.get_by_id(db, admin_id)
        if not target_admin:
            raise HTTPException(status_code=404, detail="Admin account not found.")

        if data.role and data.role != target_admin.role and updater_admin.role != "super_admin":
            raise HTTPException(status_code=403, detail="Only Super Admin can modify account roles.")

        if data.full_name is not None:
            target_admin.full_name = data.full_name.strip()
        if data.phone_number is not None:
            target_admin.phone_number = data.phone_number.strip()
        if data.email is not None:
            target_admin.email = data.email.strip()
        if data.role is not None:
            target_admin.role = data.role
        if data.is_active is not None:
            target_admin.is_active = data.is_active

        updated = AdminRepository.update(db, target_admin)

        AuditRepository.log_action(
            db,
            username=updater_admin.username,
            action="ADMIN_UPDATED",
            details=f"Updated admin account (id: {admin_id})",
            ip_address=ip_address
        )

        return AdminResponse.model_validate(updated)

    @staticmethod
    def reset_password(
        db: Session,
        admin_id: int,
        resetter_admin: AdminModel,
        background_tasks: BackgroundTasks,
        ip_address: str = "127.0.0.1"
    ) -> Tuple[str, str]:
        """Super Admin generates a new invite link to reset password."""
        target_admin = AdminRepository.get_by_id(db, admin_id)
        if not target_admin:
            raise HTTPException(status_code=404, detail="Admin account not found.")

        token = secrets.token_urlsafe(32)
        target_admin.invite_token = token
        target_admin.invite_expires_at = datetime.utcnow() + timedelta(hours=24)
        target_admin.failed_login_attempts = 0
        target_admin.account_locked_until = None

        AdminRepository.update(db, target_admin)

        invite_link = f"http://localhost:3000/admin/accept-invite?token={token}"

        AuditRepository.log_action(
            db,
            username=resetter_admin.username,
            action="PASSWORD_RESET_INVITE_SENT",
            details=f"Issued password reset invite link for '{target_admin.username or target_admin.full_name}'",
            ip_address=ip_address
        )

        background_tasks.add_task(
            send_invite_link_task,
            to_number=target_admin.phone_number,
            full_name=target_admin.full_name,
            invite_link=invite_link
        )

        return invite_link, target_admin.username or target_admin.full_name

    @staticmethod
    def soft_delete_admin(
        db: Session,
        admin_id: int,
        deleter_admin: AdminModel,
        ip_address: str = "127.0.0.1"
    ) -> None:
        """Soft delete an Admin account."""
        target_admin = AdminRepository.get_by_id(db, admin_id)
        if not target_admin:
            raise HTTPException(status_code=404, detail="Admin account not found.")

        if target_admin.id == deleter_admin.id:
            raise HTTPException(status_code=400, detail="Super Admin cannot delete their own active account.")

        AdminRepository.soft_delete(db, target_admin)

        AuditRepository.log_action(
            db,
            username=deleter_admin.username,
            action="ADMIN_DELETED",
            details=f"Soft deleted admin account (id: {admin_id})",
            ip_address=ip_address
        )
