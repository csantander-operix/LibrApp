from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import get_settings

settings = get_settings()


def _normalize_db_url(url: str) -> str:
    """Varias PaaS entregan la URL como 'postgres://…', esquema que SQLAlchemy 2.0
    ya no reconoce (espera 'postgresql://…'). Lo normalizamos acá."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


engine = create_engine(
    _normalize_db_url(settings.DATABASE_URL),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Session:
    """Dependencia inyectable que abre y cierra la sesión por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
