"""Enforce unique CI index on client.name and product.name

Revision ID: 499526e05ef3
Revises: f04c6b60e91d
Create Date: 2025-08-30 01:07:42.843756
"""
from alembic import op
import sqlalchemy as sa  # noqa


# revision identifiers, used by Alembic.
revision = "499526e05ef3"
down_revision = "f04c6b60e91d"
branch_labels = None
depends_on = None


def upgrade():
    # Crea índices únicos case-insensitive si no existen.
    # NOTA: No usamos CONCURRENTLY porque Alembic corre en transacción.
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_product_name_ci ON product (lower(name));")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_client_name_ci ON client (lower(name));")


def downgrade():
    # Elimina los índices si existen.
    op.execute("DROP INDEX IF EXISTS ux_product_name_ci;")
    op.execute("DROP INDEX IF EXISTS ux_client_name_ci;")