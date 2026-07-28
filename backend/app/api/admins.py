from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import AdminModel
from app.schemas.schemas import (
    AdminInviteRequest,
    AdminInviteResponse,
    AcceptInviteRequest,
    AdminUpdate,
    AdminResponse,
)
from app.services.admin_service import AdminService
from app.repositories.admin_repository import AdminRepository
from app.auth.dependencies import require_super_admin, get_current_admin

router = APIRouter(prefix="/api/admins", tags=["Admin Management"])


@router.get("", response_model=List[AdminResponse])
def get_all_admins(
    current_admin: AdminModel = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Super Admin endpoint to list all registered Admin accounts."""
    admins = AdminRepository.get_all(db, include_deactivated=True)
    return [AdminResponse.model_validate(a) for a in admins]


@router.post("/invite", response_model=AdminInviteResponse, status_code=status.HTTP_201_CREATED)
def invite_admin(
    data: AdminInviteRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_admin: AdminModel = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Super Admin endpoint to issue a WhatsApp Invite Link to a new Admin.
    Flow: Super Admin creates invite -> Dispatches WhatsApp invite link -> Admin sets username & password.
    """
    ip_address = request.client.host if request.client else "127.0.0.1"
    return AdminService.create_admin_invite(
        db=db,
        data=data,
        creator_admin=current_admin,
        background_tasks=background_tasks,
        ip_address=ip_address
    )


@router.post("/accept-invite", response_model=AdminResponse)
def accept_admin_invite(
    data: AcceptInviteRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public endpoint for invited Admin clicking WhatsApp link to set their username & password.
    """
    ip_address = request.client.host if request.client else "127.0.0.1"
    return AdminService.accept_admin_invite(
        db=db,
        data=data,
        ip_address=ip_address
    )


@router.put("/{admin_id}", response_model=AdminResponse)
def update_admin(
    admin_id: int,
    data: AdminUpdate,
    request: Request,
    current_admin: AdminModel = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Super Admin endpoint to update an Admin's role, name, phone, or active status."""
    ip_address = request.client.host if request.client else "127.0.0.1"
    return AdminService.update_admin(
        db=db,
        admin_id=admin_id,
        data=data,
        updater_admin=current_admin,
        ip_address=ip_address
    )


@router.post("/{admin_id}/reset-password")
def reset_admin_password(
    admin_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    current_admin: AdminModel = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Super Admin endpoint to send a new password reset invite link via WhatsApp."""
    ip_address = request.client.host if request.client else "127.0.0.1"
    invite_link, identifier = AdminService.reset_password(
        db=db,
        admin_id=admin_id,
        resetter_admin=current_admin,
        background_tasks=background_tasks,
        ip_address=ip_address
    )
    return {
        "message": f"Password reset link queued for WhatsApp delivery to '{identifier}'.",
        "invite_link": invite_link
    }


@router.delete("/{admin_id}")
def delete_admin(
    admin_id: int,
    request: Request,
    current_admin: AdminModel = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Super Admin endpoint to soft delete an Admin account."""
    ip_address = request.client.host if request.client else "127.0.0.1"
    AdminService.soft_delete_admin(
        db=db,
        admin_id=admin_id,
        deleter_admin=current_admin,
        ip_address=ip_address
    )
    return {"message": "Admin account successfully soft deleted."}
