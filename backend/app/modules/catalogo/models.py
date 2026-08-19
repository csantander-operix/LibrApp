import uuid
from decimal import Decimal
from sqlalchemy import String, Text, Integer, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.shared.models import Base, UUIDMixin, TimestampMixin


class Zona(UUIDMixin, TimestampMixin, Base):
    """Piso o sala del local (escalabilidad — RF-11). Ej: Planta Baja, Piso 1."""
    __tablename__ = "zonas"

    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    estantes: Mapped[list["Estante"]] = relationship(back_populates="zona")


class Coleccion(UUIDMixin, TimestampMixin, Base):
    """Categoría taxonómica del libro (RN-10). Ej: Humanidades, Sistemas."""
    __tablename__ = "colecciones"

    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)

    libros: Mapped[list["Libro"]] = relationship(back_populates="coleccion")


class Estante(UUIDMixin, TimestampMixin, Base):
    """Estante/sección representado en el mapa 2D (RF-01, RF-02).

    codigo: identificador visible (E1, MESA-FUTBOL, ENTRADA) — único por zona (RN-04).
    pos_x/pos_y/ancho/alto: geometría del bloque en el plano (drag & drop, RF-10/CU-05).
    """
    __tablename__ = "estantes"
    __table_args__ = (
        UniqueConstraint("zona_id", "codigo", name="uq_estante_zona_codigo"),
    )

    codigo: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    etiqueta: Mapped[str | None] = mapped_column(String(100), nullable=True)
    zona_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("zonas.id", ondelete="SET NULL"), nullable=True,
    )
    pos_x: Mapped[float] = mapped_column(Numeric(8, 2), default=0, nullable=False)
    pos_y: Mapped[float] = mapped_column(Numeric(8, 2), default=0, nullable=False)
    ancho: Mapped[float] = mapped_column(Numeric(8, 2), default=10, nullable=False)
    alto: Mapped[float] = mapped_column(Numeric(8, 2), default=10, nullable=False)

    zona: Mapped["Zona | None"] = relationship(back_populates="estantes")
    libros: Mapped[list["Libro"]] = relationship(back_populates="estante")


class Libro(UUIDMixin, TimestampMixin, Base):
    """Ejemplar del catálogo (entidad central — RF-04).

    isbn: identificador editorial, único si está presente (RN-01).
    titulo/autor/editorial: obligatorios (RN-02).
    estante_id nulo = 'Sin ubicar' (RN-07).
    """
    __tablename__ = "libros"

    isbn: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True, index=True)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    autor: Mapped[str] = mapped_column(String(255), nullable=False)
    editorial: Mapped[str] = mapped_column(String(100), nullable=False)
    precio: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    coleccion_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("colecciones.id", ondelete="SET NULL"), nullable=True,
    )
    estante_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("estantes.id", ondelete="SET NULL"), nullable=True,
    )

    coleccion: Mapped["Coleccion | None"] = relationship(back_populates="libros")
    estante: Mapped["Estante | None"] = relationship(back_populates="libros")
