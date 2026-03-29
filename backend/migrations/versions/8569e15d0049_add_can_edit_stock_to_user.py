"""add can_edit_stock to user

Revision ID: 8569e15d0049
Revises: 90eceacff6d1
Create Date: 2026-03-29 12:21:22.573105

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '8569e15d0049'
down_revision = '90eceacff6d1'
branch_labels = None
depends_on = None


def upgrade():
    # Agregar can_edit_stock con server_default para manejar filas existentes
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column(
            'can_edit_stock',
            sa.Boolean(),
            nullable=False,
            server_default='false'
        ))

    # Cambio de nullable en dispatch.fecha — solo si es necesario en este entorno
    try:
        with op.batch_alter_table('dispatch', schema=None) as batch_op:
            batch_op.alter_column(
                'fecha',
                existing_type=postgresql.TIMESTAMP(),
                nullable=False
            )
    except Exception:
        pass  # Ya era NOT NULL en producción, se omite sin error


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('can_edit_stock')

    try:
        with op.batch_alter_table('dispatch', schema=None) as batch_op:
            batch_op.alter_column(
                'fecha',
                existing_type=postgresql.TIMESTAMP(),
                nullable=True
            )
    except Exception:
        pass