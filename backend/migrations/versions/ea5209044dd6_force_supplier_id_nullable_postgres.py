"""force_supplier_id_nullable_postgres

Revision ID: ea5209044dd6
Revises: 4ca1cf24b9b4
Create Date: 2026-04-03 16:11:30.285089

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ea5209044dd6'
down_revision = '4ca1cf24b9b4'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('receipt', 'supplier_id',
                    existing_type=sa.Integer(),
                    nullable=True)


def downgrade():
    op.alter_column('receipt', 'supplier_id',
                    existing_type=sa.Integer(),
                    nullable=False)