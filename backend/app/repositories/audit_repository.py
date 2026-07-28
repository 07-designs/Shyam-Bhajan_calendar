from datetime import datetime
from typing import List
from sqlalchemy.orm import Session
from app.models.models import AuditLogModel


class AuditRepository:
    """Repository handling database logging and querying for audit trails."""

    @staticmethod
    def log_action(
        db: Session,
        username: str,
        action: str,
        details: str,
        ip_address: str = "127.0.0.1",
        user_agent: str = "Unknown"
    ) -> AuditLogModel:
        """
        Record an audit log entry.
        Actions include: LOGIN_SUCCESS, LOGIN_FAILED, ADMIN_CREATED, ADMIN_DEACTIVATED,
        PASSWORD_CHANGED, PASSWORD_RESET, BOOKING_APPROVED, BOOKING_REJECTED.
        """
        entry = AuditLogModel(
            user_username=username,
            action=action,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            timestamp=datetime.utcnow()
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def get_logs(db: Session, limit: int = 100) -> List[AuditLogModel]:
        """Fetch audit log history in reverse chronological order."""
        return db.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).limit(limit).all()
