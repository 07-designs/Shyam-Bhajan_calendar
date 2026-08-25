from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.config import settings

db_url = settings.formatted_database_url

def create_db_engine():
    if "sqlite" in db_url:
        return create_engine(db_url, connect_args={"check_same_thread": False})

    try:
        eng = create_engine(
            db_url,
            connect_args={"sslmode": "require"},
            pool_pre_ping=True,
            pool_recycle=300
        )
        with eng.connect() as conn:
            pass
        return eng
    except Exception as e:
        print(f"⚠️ PostgreSQL connection failed ({e}). Falling back to persistent SQLite storage...")
        fallback_url = "sqlite:///./shyam_bhajan_fallback.db"
        return create_engine(fallback_url, connect_args={"check_same_thread": False})


engine = create_db_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI Dependency to yield a database session per request lifecycle.
    Automatically closes session after request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
