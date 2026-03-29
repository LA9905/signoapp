"""manejo de imagenes en la tabla de despachos

Revision ID: 760bba37cbb2
Revises: b067fc15be39
Create Date: 2025-10-06 20:54:21.156752
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '760bba37cbb2'
down_revision = 'b067fc15be39'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    # Crear la tabla solo si no existe (idempotente)
    if not insp.has_table("dispatch_image"):
        op.create_table(
            "dispatch_image",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("dispatch_id", sa.Integer(), sa.ForeignKey("dispatch.id"), nullable=False),
            sa.Column("image_url", sa.String(length=255), nullable=False),
            sa.Column("uploaded_at", sa.DateTime(), nullable=True),
        )


def downgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    # Eliminar la tabla solo si existe
    if insp.has_table("dispatch_image"):
        op.drop_table("dispatch_image")