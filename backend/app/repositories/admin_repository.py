from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.models import AdminModel


class AdminRepository:
    """Repository handling database persistence for Admin user accounts."""

    @staticmethod
    def get_by_id(db: Session, admin_id: int) -> Optional[AdminModel]:
        return db.query(AdminModel).filter(
            AdminModel.id == admin_id,
            AdminModel.is_deleted == False
        ).first()

    @staticmethod
    def get_by_username(db: Session, username: str) -> Optional[AdminModel]:
        return db.query(AdminModel).filter(
            AdminModel.username == username,
            AdminModel.is_deleted == False
        ).first()

    @staticmethod
    def get_all(db: Session, include_deactivated: bool = True) -> List[AdminModel]:
        query = db.query(AdminModel).filter(AdminModel.is_deleted == False)
        if not include_deactivated:
            query = query.filter(AdminModel.is_active == True)
        return query.order_by(AdminModel.created_at.desc()).all()

    @staticmethod
    def create(db: Session, admin: AdminModel) -> AdminModel:
        db.add(admin)
        db.commit()
        db.refresh(admin)
        return admin

    @staticmethod
    def update(db: Session, admin: AdminModel) -> AdminModel:
        admin.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(admin)
        return admin

    @staticmethod
    def soft_delete(db: Session, admin: AdminModel) -> None:
        admin.is_deleted = True
        admin.is_active = False
        admin.updated_at = datetime.utcnow()
        db.commit()
