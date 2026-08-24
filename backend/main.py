from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.services.admin_service import AdminService
from app.services.settings_service import SettingsService
from app.api.bookings import router as bookings_router
from app.api.members import router as members_router
from app.api.auth import router as auth_router
from app.api.admins import router as admins_router
from app.api.audit import router as audit_router
from app.api.settings import router as settings_router

# Automatically create schema tables in database if missing
try:
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        AdminService.ensure_initial_super_admin(
            db=db,
            default_username=settings.ADMIN_USERNAME,
            default_hash=settings.ADMIN_PASSWORD_HASH
        )
        SettingsService.get_settings(db)
    finally:
        db.close()
except Exception as e:
    print(f"⚠️ Startup DB Init Warning: {e}")

# Create FastAPI Application Instance
app = FastAPI(
    title="Shyam Bhajan Seva API",
    description="Devotional Kirtan Event & Role-Based Admin Management System",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://shreenishanyatraparivar.vercel.app",
        "https://shyam-bhajan-calendar.vercel.app"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)
app.include_router(admins_router)
app.include_router(settings_router)
app.include_router(audit_router)
app.include_router(bookings_router)
app.include_router(members_router)


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Shyam Bhajan Seva Role-Based Admin Management System",
        "version": "2.0.0"
    }