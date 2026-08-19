import enum
from sqlalchemy import String, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.models import Base, UUIDMixin, TimestampMixin


class RolEnum(str, enum.Enum):
    """Roles del sistema (RF-08, RN-05).

    - admin:   acceso total (ABM de catálogo, mapa, importación).
    - publico: solo lectura / autoconsulta (no requiere login para la vista pública,
               pero se modela por completitud y para futuros usuarios de solo lectura).
    """
    admin = "admin"
    publico = "publico"


class Usuario(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "usuarios"

    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    nombre: Mapped[str | None] = mapped_column(String(120), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[RolEnum] = mapped_column(
        SAEnum(RolEnum, name="rol_enum"), nullable=False, default=RolEnum.admin,
    )
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)
