"""Esquema inicial: usuarios, zonas, colecciones, estantes, libros.

Revision ID: 0001_inicial
Revises:
Create Date: 2026-08-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_inicial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── usuarios ──────────────────────────────────────────────────────────────
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("nombre", sa.String(length=120), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "rol",
            sa.Enum("admin", "publico", name="rol_enum"),
            nullable=False,
        ),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_usuarios_username"), "usuarios", ["username"], unique=True)

    # ── zonas ─────────────────────────────────────────────────────────────────
    op.create_table(
        "zonas",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── colecciones ─────────────────────────────────────────────────────────---
    op.create_table(
        "colecciones",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
    )

    # ── estantes ────────────────────────────────────────────────────────────---
    op.create_table(
        "estantes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("codigo", sa.String(length=20), nullable=False),
        sa.Column("etiqueta", sa.String(length=100), nullable=True),
        sa.Column("zona_id", sa.Uuid(), nullable=True),
        sa.Column("pos_x", sa.Numeric(8, 2), nullable=False, server_default="0"),
        sa.Column("pos_y", sa.Numeric(8, 2), nullable=False, server_default="0"),
        sa.Column("ancho", sa.Numeric(8, 2), nullable=False, server_default="10"),
        sa.Column("alto", sa.Numeric(8, 2), nullable=False, server_default="10"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["zona_id"], ["zonas.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("zona_id", "codigo", name="uq_estante_zona_codigo"),
    )
    op.create_index(op.f("ix_estantes_codigo"), "estantes", ["codigo"], unique=False)

    # ── libros ────────────────────────────────────────────────────────────────
    op.create_table(
        "libros",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("isbn", sa.String(length=20), nullable=True),
        sa.Column("titulo", sa.String(length=255), nullable=False),
        sa.Column("autor", sa.String(length=255), nullable=False),
        sa.Column("editorial", sa.String(length=100), nullable=False),
        sa.Column("precio", sa.Numeric(10, 2), nullable=True),
        sa.Column("coleccion_id", sa.Uuid(), nullable=True),
        sa.Column("estante_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["coleccion_id"], ["colecciones.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["estante_id"], ["estantes.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("isbn"),
    )
    op.create_index(op.f("ix_libros_isbn"), "libros", ["isbn"], unique=False)
    op.create_index(op.f("ix_libros_titulo"), "libros", ["titulo"], unique=False)


def downgrade() -> None:
    op.drop_table("libros")
    op.drop_table("estantes")
    op.drop_table("colecciones")
    op.drop_table("zonas")
    op.drop_table("usuarios")
    sa.Enum(name="rol_enum").drop(op.get_bind(), checkfirst=True)
