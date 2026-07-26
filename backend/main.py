from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.api.bookings import router as bookings_router
from app.api.members import router as members_router
from app.api.auth import router as auth_router

# Automatically create schema tables in database if missing
Base.metadata.create_all(bind=engine)

# Create FastAPI Application Instance
app = FastAPI(
    title="Shyam Bhajan Seva API",
    description="Devotional Kirtan Event Management API with WhatsApp Notification Service",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(bookings_router)
app.include_router(members_router)
app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Shyam Bhajan Seva API",
        "version": "2.0.0"
    }