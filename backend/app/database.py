from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.config import settings

db_url = settings.formatted_database_url

def create_db_engine():
    # If explicitly SQLite or if PostgreSQL fails, use SQLite engine
    if "sqlite" in db_url:
        return create_engine(db_url, connect_args={"check_same_thread": False})

    try:
        eng = create_engine(
            db_url,
            connect_args={"sslmode": "require"},
            pool_pre_ping=True,
            pool_recycle=60
        )
        with eng.connect() as conn:
            pass
        return eng
    except Exception as e:
        print(f"⚠️ PostgreSQL connection failed ({e}). Using persistent SQLite database...")
        return create_engine("sqlite:///./shyam_bhajan.db", connect_args={"check_same_thread": False})


try:
    engine = create_db_engine()
except Exception:
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
