from sqlalchemy.orm import Session
from app.models.models import SettingsModel
from app.schemas.schemas import SettingsUpdate, SettingsResponse
from app.repositories.audit_repository import AuditRepository


class SettingsService:
    """Service handling dynamic Mandal configuration settings."""

    @staticmethod
    def get_settings(db: Session) -> SettingsModel:
        """Fetch or initialize default Mandal settings."""
        settings = db.query(SettingsModel).filter(SettingsModel.id == 1).first()
        if not settings:
            settings = SettingsModel(id=1)
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return settings

    @staticmethod
    def update_settings(
        db: Session,
        data: SettingsUpdate,
        updater_username: str,
        ip_address: str = "127.0.0.1"
    ) -> SettingsResponse:
        """Update dynamic Mandal settings (Super Admin only)."""
        settings = SettingsService.get_settings(db)

        if data.mandal_name is not None:
            settings.mandal_name = data.mandal_name.strip()
        if data.whatsapp_contact is not None:
            settings.whatsapp_contact = data.whatsapp_contact.strip()
        if data.admin_notification_numbers is not None:
            settings.admin_notification_numbers = data.admin_notification_numbers.strip()
        if data.booking_auto_reply_template is not None:
            settings.booking_auto_reply_template = data.booking_auto_reply_template.strip()
        if data.website_contact_numbers is not None:
            settings.website_contact_numbers = data.website_contact_numbers.strip()

        db.commit()
        db.refresh(settings)

        AuditRepository.log_action(
            db,
            username=updater_username,
            action="SETTINGS_UPDATED",
            details="Updated dynamic Mandal configuration & templates",
            ip_address=ip_address
        )

        return SettingsResponse.model_validate(settings)
