from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List


class Settings(BaseSettings):
    """
    Centralized Application Configuration.
    Loads environment variables from .env file only once.
    Exposes configuration properties to all parts of the application.
    """
    # Database Configuration
    DATABASE_URL: str = "sqlite:///./shyam_bhajan.db"

    # Twilio WhatsApp Configuration
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_WHATSAPP_FROM: Optional[str] = None
    ADMIN_WHATSAPP_NUMBER: Optional[str] = None
    ADMIN_PANEL_URL: str = "https://shreenishanyatraparivar.vercel.app/admin"

    # Admin Authentication & Security
    ADMIN_USERNAME: str = "shyam_bhajan_admin"
    ADMIN_PASSWORD_HASH: Optional[str] = None
    JWT_SECRET: str = "shyam_bhajan_seva_secret_key_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Security Lockout Parameters
    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def formatted_database_url(self) -> str:
        """
        Fix for PostgreSQL connection strings on platforms like Render/Heroku.
        Replaces postgres:// with postgresql:// if needed, and ensures sslmode=prefer is set.
        """
        url = self.DATABASE_URL
        if url and url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)

        if url and "postgresql" in url and "sslmode=" not in url:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}sslmode=prefer"

        return url

    @property
    def admin_whatsapp_numbers(self) -> List[str]:
        """
        Parse comma-separated ADMIN_WHATSAPP_NUMBER string into a clean list of numbers.
        Supports 1, 2, 3 or more admin WhatsApp recipients.
        """
        if not self.ADMIN_WHATSAPP_NUMBER:
            return []
        return [
            num.strip()
            for num in self.ADMIN_WHATSAPP_NUMBER.split(",")
            if num.strip()
        ]


# Expose a single global instance of Settings for centralized configuration access
settings = Settings()
