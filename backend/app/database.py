from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.config import settings

db_url = settings.formatted_database_url

def create_db_engine():
    # If explicitly SQLite
    if "sqlite" in db_url:
        return create_engine(db_url, connect_args={"check_same_thread": False})

    # For PostgreSQL (Render Internal or External URL)
    try:
        eng = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_recycle=300
        )
        with eng.connect() as conn:
            pass
        return eng
    except Exception as e:
        print(f"⚠️ PostgreSQL primary connection warning ({e}). Initializing fallback engine...")
        return create_engine(db_url, pool_pre_ping=True)


try:
    engine = create_db_engine()
except Exception as err:
    print(f"⚠️ Initializing SQLite persistent fallback due to: {err}")
    engine = create_engine("sqlite:///./shyam_bhajan.db", connect_args={"check_same_thread": False})

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
