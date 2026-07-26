from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


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
    ADMIN_PANEL_URL: str = "http://localhost:3000/admin"

    # Admin Authentication & Security
    ADMIN_USERNAME: str = "shyam_bhajan_admin"
    ADMIN_PASSWORD_HASH: Optional[str] = None
    JWT_SECRET: str = "shyam_bhajan_seva_secret_key_2026"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def formatted_database_url(self) -> str:
        """
        Fix for PostgreSQL connection strings on platforms like Render/Heroku.
        Replaces postgres:// with postgresql:// if needed.
        """
        url = self.DATABASE_URL
        if url and url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql://", 1)
        return url

    @property
    def admin_whatsapp_numbers(self) -> list[str]:
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
