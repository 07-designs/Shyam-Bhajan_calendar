from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import AdminModel
from app.schemas.schemas import SettingsUpdate, SettingsResponse
from app.services.settings_service import SettingsService
from app.auth.dependencies import require_super_admin, get_current_admin

router = APIRouter(prefix="/api/settings", tags=["Mandal Settings"])


@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Fetch current Mandal settings & templates (Public / Admin)."""
    settings = SettingsService.get_settings(db)
    return SettingsResponse.model_validate(settings)


@router.put("", response_model=SettingsResponse)
def update_settings(
    data: SettingsUpdate,
    request: Request,
    current_admin: AdminModel = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Super Admin endpoint to edit Mandal Name, WhatsApp numbers, Auto-reply template, etc.
    Eliminates needing a developer to update contact info or notification numbers.
    """
    ip_address = request.client.host if request.client else "127.0.0.1"
    return SettingsService.update_settings(
        db=db,
        data=data,
        updater_username=current_admin.username,
        ip_address=ip_address
    )
