"""add notify_low_stock and notify_pending_dispatches

Revision ID: 0d3e88b31f86
Revises: 70496d8af825
Create Date: 2026-08-19 22:22:41.299603

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0d3e88b31f86'
down_revision = '70496d8af825'
branch_labels = None
depends_on = None


def upgrade():
    # Compatible con PostgreSQL (local y Render)
    # server_default rellena las filas existentes con TRUE y evita NotNullViolation
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'notify_low_stock',
                sa.Boolean(),
                nullable=False,
                server_default=sa.text('true')
            )
        )
        batch_op.add_column(
            sa.Column(
                'notify_pending_dispatches',
                sa.Boolean(),
                nullable=False,
                server_default=sa.text('true')
            )
        )


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('notify_pending_dispatches')
        batch_op.drop_column('notify_low_stock')