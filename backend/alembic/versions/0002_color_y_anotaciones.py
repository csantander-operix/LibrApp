"""Color de estantes + anotaciones del mapa (flechas / textos).

Revision ID: 0002_color_y_anotaciones
Revises: 0001_inicial
Create Date: 2026-08-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_color_y_anotaciones"
down_revision: Union[str, None] = "0001_inicial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Color por estante (diferenciar categorías de un vistazo). Nulo = color de zona.
    op.add_column("estantes", sa.Column("color", sa.String(length=9), nullable=True))

    # ── anotaciones del mapa (ENTRADA, ESCALERA, VENTANA, flechas, etc.) ────────
    op.create_table(
        "anotaciones_mapa",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("zona_id", sa.Uuid(), nullable=True),
        sa.Column("tipo", sa.String(length=20), nullable=False, server_default="texto"),
        sa.Column("texto", sa.String(length=120), nullable=True),
        sa.Column("pos_x", sa.Numeric(8, 2), nullable=False, server_default="0"),
        sa.Column("pos_y", sa.Numeric(8, 2), nullable=False, server_default="0"),
        sa.Column("ancho", sa.Numeric(8, 2), nullable=False, server_default="14"),
        sa.Column("alto", sa.Numeric(8, 2), nullable=False, server_default="6"),
        sa.Column("rotacion", sa.Numeric(6, 2), nullable=False, server_default="0"),
        sa.Column("color", sa.String(length=9), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["zona_id"], ["zonas.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("anotaciones_mapa")
    op.drop_column("estantes", "color")
