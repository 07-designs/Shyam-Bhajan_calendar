from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import AdminModel
from app.schemas.schemas import AuditLogResponse
from app.repositories.audit_repository import AuditRepository
from app.auth.dependencies import require_super_admin

router = APIRouter(prefix="/api/audit", tags=["Security Audit Logs"])


@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = 100,
    current_admin: AdminModel = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Super Admin endpoint to inspect security audit trail entries.
    Tracks logins, admin creations, password changes, and booking status updates.
    """
    logs = AuditRepository.get_logs(db, limit=limit)
    return [AuditLogResponse.model_validate(log) for log in logs]
