from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import BookingModel
from app.schemas.schemas import BookingCreate, BookingResponse
from app.services.whatsapp_service import send_booking_notification_task

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


@router.get("", response_model=List[BookingResponse])
def get_bookings(db: Session = Depends(get_db)):
    """Fetch all recorded event bookings."""
    return db.query(BookingModel).all()


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking: BookingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Create a new Bhajan Sandhya booking request.
    
    Flow:
    1. Validate request date uniqueness
    2. Save booking record to database
    3. Queue WhatsApp notification task in BackgroundTasks
    4. Return success response immediately without blocking on network latency
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

    # 4. Return saved booking response immediately
    return db_booking


@router.patch("/{booking_id}/status")
def update_booking_status(booking_id: int, status: str, db: Session = Depends(get_db)):
    """Update status of a booking (e.g., Approved, Rescheduled, Rejected)."""
    booking = db.query(BookingModel).filter(BookingModel.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking setup record not found.")
    booking.status = status
    db.commit()
    return {"message": f"Booking successfully updated to {status}"}


@router.delete("/{booking_id}")
def delete_booking(booking_id: int, db: Session = Depends(get_db)):
    """Delete a booking request."""
    booking = db.query(BookingModel).filter(BookingModel.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking request not found.")
    db.delete(booking)
    db.commit()
    return {"message": "Booking request successfully deleted"}
