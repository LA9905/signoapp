"""add super admin and employee links to user

Revision ID: 3d9f21a7c4e2
Revises: 8f7a66c9ce1c
Create Date: 2026-08-20 19:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '3d9f21a7c4e2'
down_revision = '8f7a66c9ce1c'
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    return column_name in [c["name"] for c in inspector.get_columns(table_name)]


def upgrade():
    if not _has_column('user', 'is_super_admin'):
        op.add_column(
            'user',
            sa.Column('is_super_admin', sa.Boolean(), nullable=False, server_default=sa.false()),
        )
        op.alter_column('user', 'is_super_admin', server_default=None)

        op.execute('UPDATE "user" SET is_super_admin = true WHERE is_admin = true')

    if not _has_column('user', 'linked_operator_id'):
        op.add_column('user', sa.Column('linked_operator_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            'fk_user_linked_operator_id', 'user', 'operator',
            ['linked_operator_id'], ['id'], ondelete='SET NULL',
        )

    if not _has_column('user', 'linked_driver_id'):
        op.add_column('user', sa.Column('linked_driver_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            'fk_user_linked_driver_id', 'user', 'driver',
            ['linked_driver_id'], ['id'], ondelete='SET NULL',
        )


def downgrade():
    if _has_column('user', 'linked_driver_id'):
        op.drop_constraint('fk_user_linked_driver_id', 'user', type_='foreignkey')
        op.drop_column('user', 'linked_driver_id')
    if _has_column('user', 'linked_operator_id'):
        op.drop_constraint('fk_user_linked_operator_id', 'user', type_='foreignkey')
        op.drop_column('user', 'linked_operator_id')
    if _has_column('user', 'is_super_admin'):
        op.drop_column('user', 'is_super_admin')