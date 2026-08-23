"""add tipo to operator_activity

Revision ID: 8f7a66c9ce1c
Revises: 0d3e88b31f86
Create Date: 2026-08-20 18:13:55.562076

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '8f7a66c9ce1c'
down_revision = '0d3e88b31f86'
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c["name"] for c in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    if not _has_column('operator_activity', 'tipo'):
        op.add_column(
            'operator_activity',
            sa.Column('tipo', sa.String(length=10), nullable=False, server_default='otra'),
        )
        op.alter_column('operator_activity', 'tipo', server_default=None)


def downgrade():
    if _has_column('operator_activity', 'tipo'):
        op.drop_column('operator_activity', 'tipo')