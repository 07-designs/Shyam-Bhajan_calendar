import jwt
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Request, Depends, HTTPException, status, Cookie
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import AdminModel


def create_access_token(data: dict) -> str:
    """Create a short-lived access token (15 minutes)."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create a long-lived refresh token (7 days)."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate JWT token signature."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please log in again."
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token."
        )


def get_current_admin(
    request: Request,
    admin_session: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
) -> AdminModel:
    """
    FastAPI Dependency to authenticate current logged-in admin from Bearer token or cookie.
    Validates active status and lockout status.
    """
    token = None

    # 1. Check Authorization Header Bearer token first
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]

    # 2. Fallback to Cookie if Header not present
    if not token:
        token = admin_session

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in."
        )

    payload = decode_token(token)
    username: str = payload.get("username")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload."
        )

    admin = db.query(AdminModel).filter(
        AdminModel.username == username,
        AdminModel.is_deleted == False
    ).first()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin account not found or deleted."
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This admin account is currently deactivated. Contact Super Admin."
        )

    return admin


def require_role(allowed_roles: List[str]):
    """
    RBAC Dependency factory. Enforces role restrictions at the endpoint layer.
    Example: Depends(require_role(["super_admin", "admin"]))
    """
    def role_checker(current_admin: AdminModel = Depends(get_current_admin)) -> AdminModel:
        if current_admin.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
            )
        return current_admin
    return role_checker


def require_super_admin(current_admin: AdminModel = Depends(get_current_admin)) -> AdminModel:
    """Convenience RBAC dependency requiring Super Admin privileges."""
    if current_admin.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Super Admin only."
        )
    return current_admin
