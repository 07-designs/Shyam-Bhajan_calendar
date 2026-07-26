from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import MandalMemberModel
from app.schemas.schemas import MemberCreate, MemberResponse

router = APIRouter(prefix="/api/members", tags=["Mandal Members"])


@router.get("", response_model=List[MemberResponse])
def get_members(db: Session = Depends(get_db)):
    """Retrieve active mandal members roster."""
    return db.query(MandalMemberModel).all()


@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(member: MemberCreate, db: Session = Depends(get_db)):
    """Register a new member to the active roster."""
    db_member = MandalMemberModel(
        name=member.name,
        phone=member.phone,
        role=member.role
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member


@router.delete("/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db)):
    """Remove a member from the active roster."""
    member = db.query(MandalMemberModel).filter(MandalMemberModel.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Mandal member not found.")
    db.delete(member)
    db.commit()
    return {"message": "Mandal member successfully removed"}
