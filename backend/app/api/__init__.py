from app.api.bookings import router as bookings_router
from app.api.members import router as members_router
from app.api.auth import router as auth_router
from app.api.admins import router as admins_router
from app.api.audit import router as audit_router
from app.api.settings import router as settings_router

__all__ = [
    "bookings_router",
    "members_router",
    "auth_router",
    "admins_router",
    "audit_router",
    "settings_router",
]
