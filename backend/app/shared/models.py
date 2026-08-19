import uuid
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """Agrega created_at y updated_at a cualquier modelo."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )


class UUIDMixin:
    """PK como UUID v4, generado en Python (no en la DB)."""
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
