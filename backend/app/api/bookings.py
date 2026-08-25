from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import BookingModel, AdminModel
from app.schemas.schemas import BookingCreate, BookingResponse
from app.services.whatsapp_service import send_booking_notification_task
from app.repositories.audit_repository import AuditRepository
from app.auth.dependencies import get_current_admin, require_role

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


@router.get("", response_model=List[BookingResponse])
def get_bookings(
    db: Session = Depends(get_db)
):
    """Fetch recorded event bookings (Public access for datepicker validation & admin panel)."""
    return db.query(BookingModel).all()


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking: BookingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Public endpoint: Create a new Bhajan Sandhya booking request.
    Validates request date uniqueness, saves booking to DB, and queues WhatsApp alert in BackgroundTasks.
    """
    # 1. Validate date availability
    existing = db.query(BookingModel).filter(BookingModel.booking_date == booking.booking_date).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This date is already allocated or pending confirmation."
        )

    # 2. Save booking to database
    db_booking = BookingModel(
        full_name=booking.full_name,
        address=booking.address,
        phone=booking.phone,
        alt_phone=booking.alt_phone,
        booking_date=booking.booking_date
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)

    # 3. Queue non-blocking WhatsApp alert via BackgroundTasks
    booking_payload = {
        "full_name": db_booking.full_name,
        "phone": db_booking.phone,
        "address": db_booking.address,
        "booking_date": str(db_booking.booking_date),
        "notes": getattr(booking, "notes", "None") or "None"
    }

    background_tasks.add_task(send_booking_notification_task, booking_payload)

    return db_booking


@router.patch("/{booking_id}/status")
def update_booking_status(
    booking_id: int,
    status_str: str,
    request: Request,
    current_admin: AdminModel = Depends(require_role(["super_admin", "admin"])),
    db: Session = Depends(get_db)
):
    """Update status of a booking (Protected: Admin, Super Admin)."""
    booking = db.query(BookingModel).filter(BookingModel.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking setup record not found.")

    booking.status = status_str
    db.commit()

    # Log action in Audit Trail
    ip_address = request.client.host if request.client else "127.0.0.1"
    AuditRepository.log_action(
        db,
        username=current_admin.username,
        action=f"BOOKING_{status_str.upper()}",
        details=f"Updated booking status for host '{booking.full_name}' to '{status_str}'",
        ip_address=ip_address
    )

    return {"message": f"Booking successfully updated to {status_str}"}


@router.delete("/{booking_id}")
def delete_booking(
    booking_id: int,
    request: Request,
    current_admin: AdminModel = Depends(require_role(["super_admin", "admin"])),
    db: Session = Depends(get_db)
):
    """Delete a booking request (Protected: Admin, Super Admin)."""
    booking = db.query(BookingModel).filter(BookingModel.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking request not found.")

    host_name = booking.full_name
    db.delete(booking)
    db.commit()

    ip_address = request.client.host if request.client else "127.0.0.1"
    AuditRepository.log_action(
        db,
        username=current_admin.username,
        action="BOOKING_DELETED",
        details=f"Deleted booking request for host '{host_name}'",
        ip_address=ip_address
    )

    return {"message": "Booking request successfully deleted"}
