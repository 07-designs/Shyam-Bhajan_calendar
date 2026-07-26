import hashlib
import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import AdminModel
from app.schemas.schemas import LoginRequest, AdminCreate

router = APIRouter(prefix="/api/admin", tags=["Authentication"])


@router.post("/login")
def admin_login(data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """
    Authenticate administrative credentials and set httpOnly session cookie.
    Reads master admin parameters strictly from config.py.
    """
    input_hash = hashlib.sha256(data.password.encode('utf-8')).hexdigest()

    # Validate Master Credentials from Settings Config
    if data.username != settings.ADMIN_USERNAME or input_hash != settings.ADMIN_PASSWORD_HASH:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Generate JWT Token
    expiration = datetime.utcnow() + timedelta(days=1)
    token = jwt.encode(
        {"role": "admin", "username": data.username, "exp": expiration},
        settings.JWT_SECRET,
        algorithm="HS256"
    )

    # Set Cookie
    response.set_cookie(
        key="admin_session",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False
    )

    return {"message": "Login successful"}


@router.post("/logout")
def admin_logout(response: Response):
    """Clear admin session cookie."""
    response.delete_cookie(key="admin_session")
    return {"message": "Logged out successfully"}


@router.post("/create-new")
def create_new_admin(data: AdminCreate, db: Session = Depends(get_db)):
    """Register a new admin account."""
    existing = db.query(AdminModel).filter(AdminModel.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists.")

    new_admin = AdminModel(username=data.username, password=data.password, name=data.name)
    db.add(new_admin)
    db.commit()
    return {"message": f"Successfully created admin account for {data.name}"}
