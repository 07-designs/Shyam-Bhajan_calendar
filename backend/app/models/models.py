from sqlalchemy import Column, Integer, String, Date
from app.database import Base


class BookingModel(Base):
    """
    SQLAlchemy model representing a Bhajan Sandhya event booking request.
    """
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    alt_phone = Column(String, nullable=True)
    booking_date = Column(Date, unique=True, nullable=False)
    status = Column(String, default="Pending")  # Pending, Approved, Rescheduled, Rejected


class MandalMemberModel(Base):
    """
    SQLAlchemy model representing an active Mandal member.
    """
    __tablename__ = "mandal_members"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Singer, Harmonium, Dholak, etc.


class AdminModel(Base):
    """
    SQLAlchemy model representing registered admin accounts.
    """
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String, nullable=False)
