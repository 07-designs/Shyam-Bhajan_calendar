import os
import hashlib
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from sqlalchemy import create_engine, Column, Integer, String, Date, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import jwt
from datetime import datetime, timedelta
from fastapi import Response, Cookie
load_dotenv()

ADMIN_USER = os.getenv("ADMIN_USERNAME", "shyam_bhajan_admin")
ADMIN_HASH = os.getenv("ADMIN_PASSWORD_HASH")
JWT_SECRET = os.getenv("JWT_SECRET", "shyam_bhajan_seva_secret_key_2026")
# ---- DYNAMIC DATABASE CONFIGURATION (SQLite -> Production Database) ----
# Falls back to local SQLite file if DATABASE_URL environment variable is not defined
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./shyam_bhajan.db")

# Fix for platforms like Render/Heroku that use 'postgres://' instead of 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Connect configuration varies depending on whether we use SQLite or a client relational server
if "sqlite" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---- DATABASE MODELS ----
class BookingModel(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    alt_phone = Column(String, nullable=True) # Changed from Optional=True to valid SQLAlchemy syntax
    booking_date = Column(Date, unique=True, nullable=False)
    status = Column(String, default="Pending") # Pending, Approved, Rescheduled

class MandalMemberModel(Base):
    __tablename__ = "mandal_members"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    role = Column(String, nullable=False) # e.g., Singer, Harmonium, Dholak

# Add this alongside your existing BookingModel and MandalMemberModel
class AdminModel(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False) # In full production, you can hash this with bcrypt
    name = Column(String, nullable=False)


# Automatically instantiate tables in target DB schema context
Base.metadata.create_all(bind=engine)

# ---- APP & CORS INITIALIZATION ----
app = FastAPI(title="Shyam Bhajan Seva API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # ✅ Explicitly allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB Dependency injection session lifecycle hook
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---- PYDANTIC SCHEMAS (Pydantic v2 compatible syntax) ----
class BookingCreate(BaseModel):
    full_name: str
    address: str
    phone: str
    alt_phone: Optional[str] = None
    booking_date: date

class BookingResponse(BookingCreate):
    id: int
    status: str
    model_config = {"from_attributes": True} # Replaced legacy Config class for Pydantic v2 support

class MemberCreate(BaseModel):
    name: str
    phone: str
    role: str

class LoginRequest(BaseModel):
    username: str
    password: str

class AdminCreate(BaseModel):
    username: str
    password: str
    name: str

class MemberResponse(MemberCreate):
    id: int
    model_config = {"from_attributes": True} # Replaced legacy Config class for Pydantic v2 support

# ---- NOTIFICATION ABSTRACT SERVICE ----
class NotificationService:
    @staticmethod
    def send_mandal_alert(booking: BookingModel):
        """
        Send WhatsApp notification to admin when a new booking is created.
        Falls back to console print if Twilio is not configured.
        """
        # Load Twilio config from environment
        twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        twilio_from = os.getenv("TWILIO_WHATSAPP_FROM")  # e.g., "whatsapp:+14155238886"
        admin_whatsapp = os.getenv("ADMIN_WHATSAPP_NUMBER")  # e.g., "whatsapp:+919876543210"
        admin_panel_url = os.getenv("ADMIN_PANEL_URL", "http://localhost:3000/admin")

        # Build message
        message_body = (
            f"🙏 *Jai Shree Shyam!*\n\n"
            f"*New Booking Request*\n\n"
            f"👤 *Name:* {booking.full_name}\n"
            f"📅 *Date:* {booking.booking_date.strftime('%d %B %Y')}\n"
            f"📍 *Address:* {booking.address}\n"
            f"📞 *Phone:* {booking.phone}\n\n"
            f"Please review and approve/reschedule:\n"
            f"👉 {admin_panel_url}"
        )

        # Attempt to send via Twilio if configured
        if all([twilio_account_sid, twilio_auth_token, twilio_from, admin_whatsapp]):
            try:
                from twilio.rest import Client
                client = Client(twilio_account_sid, twilio_auth_token)
                message = client.messages.create(
                    body=message_body,
                    from_=twilio_from,
                    to=admin_whatsapp
                )
                print(f"\n✅ WhatsApp notification sent successfully! SID: {message.sid}\n")
            except Exception as e:
                print(f"\n❌ Failed to send WhatsApp: {e}\n")
                print("Fallback: Logging message to console.")
                print("\n" + "="*60)
                print(message_body)
                print("="*60 + "\n")
        else:
            # Fallback: print to console if Twilio not configured
            print("\n" + "="*60)
            print("--- TWILIO NOT CONFIGURED (Console Fallback) ---")
            print(message_body)
            print("="*60 + "\n")

# ---- CONTROLLERS / ROUTERS ----

@app.get("/api/bookings", response_model=List[BookingResponse])
def get_bookings(db: Session = Depends(get_db)):
    return db.query(BookingModel).all()

@app.post("/api/bookings", response_model=BookingResponse, status_code=201)
def create_booking(booking: BookingCreate, db: Session = Depends(get_db)):
    existing = db.query(BookingModel).filter(BookingModel.booking_date == booking.booking_date).first()
    if existing:
        raise HTTPException(status_code=400, detail="This date is already allocated or pending confirmation.")
    
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
    
    NotificationService.send_mandal_alert(db_booking)
    return db_booking

@app.patch("/api/bookings/{booking_id}/status")
def update_booking_status(booking_id: int, status: str, db: Session = Depends(get_db)):
    booking = db.query(BookingModel).filter(BookingModel.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking setup record not found.")
    booking.status = status
    db.commit()
    return {"message": f"Booking successfully updated to {status}"}

@app.delete("/api/bookings/{booking_id}")
def delete_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(BookingModel).filter(BookingModel.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking request not found.")
    db.delete(booking)
    db.commit()
    return {"message": "Booking request successfully deleted"}

@app.get("/api/members", response_model=List[MemberResponse])
def get_members(db: Session = Depends(get_db)):
    return db.query(MandalMemberModel).all()

@app.post("/api/members", response_model=MemberResponse)
def add_member(member: MemberCreate, db: Session = Depends(get_db)):
    db_member = MandalMemberModel(
        name=member.name,
        phone=member.phone,
        role=member.role
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

@app.delete("/api/members/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(MandalMemberModel).filter(MandalMemberModel.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Mandal member not found.")
    db.delete(member)
    db.commit()
    return {"message": "Mandal member successfully removed"}

@app.post("/api/admin/login")
def admin_login(data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    # Hash incoming plain text password
    input_hash = hashlib.sha256(data.password.encode('utf-8')).hexdigest()
    
    print(f"Received Username: '{data.username}' vs Expected: '{ADMIN_USER}'")
    print(f"Received Hash: '{input_hash}'")
    print(f"Expected Hash: '{ADMIN_HASH}'")

    # 1. Validate Master Credentials
    if data.username != ADMIN_USER or input_hash != ADMIN_HASH:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    # 2. Generate JWT Token directly (Skip DB check for Master Admin)
    expiration = datetime.utcnow() + timedelta(days=1)
    token = jwt.encode(
        {"role": "admin", "username": data.username, "exp": expiration}, 
        JWT_SECRET, 
        algorithm="HS256"
    )
    
    # 3. Set Cookie
    response.set_cookie(
        key="admin_session",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False
    )

    return {"message": "Login successful"}

@app.post("/api/admin/create-new")
def create_new_admin(data: AdminCreate, db: Session = Depends(get_db)):
    # Check if username exists
    existing = db.query(AdminModel).filter(AdminModel.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists.")
        
    new_admin = AdminModel(username=data.username, password=data.password, name=data.name)
    db.add(new_admin)
    db.commit()
    return {"message": f"Successfully created admin account for {data.name}"}