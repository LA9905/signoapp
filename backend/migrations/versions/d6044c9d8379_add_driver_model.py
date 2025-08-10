"""Add Driver model

Revision ID: d6044c9d8379
Revises: 039ce84eb8ab
Create Date: 2025-08-06 21:43:47.628291
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "d6044c9d8379"
down_revision = "039ce84eb8ab"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    # Crear la tabla solo si no existe (idempotente)
    if not insp.has_table("driver"):
        op.create_table(
            "driver",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("created_by", sa.String(length=50), nullable=False),
        )


def downgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    # Eliminar la tabla solo si existe
    if insp.has_table("driver"):
        op.drop_table("driver")