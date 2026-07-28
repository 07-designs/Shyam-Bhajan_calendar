import re
import secrets
import string
import random
import bcrypt
from fastapi import HTTPException, status


def hash_password(password: str) -> str:
    """Hash a plain text password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def validate_password_strength(password: str) -> None:
    """
    Enforce strict password rules:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter."
        )
    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter."
        )
    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one numerical digit."
        )
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one special character."
        )


def generate_username(full_name: str) -> str:
    """Generate a clean, lowercased username from full name."""
    clean_name = re.sub(r"[^a-zA-Z0-9\s]", "", full_name).strip().lower()
    parts = clean_name.split()
    if not parts:
        return f"admin_{random.randint(1000, 9999)}"
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]}_{parts[1]}"


def generate_temp_password() -> str:
    """Generate a secure temporary password complying with password rules."""
    prefix = "Shyam"
    special = random.choice(["@", "#", "$", "!", "%"])
    digits = f"{random.randint(1000, 9999)}"
    return f"{prefix}{special}{digits}"


def generate_otp() -> str:
    """Generate a 6-digit numeric OTP for WhatsApp password reset."""
    return f"{random.randint(100000, 999999)}"
