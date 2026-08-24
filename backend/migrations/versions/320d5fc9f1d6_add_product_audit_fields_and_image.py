"""add product audit fields and image

Revision ID: 320d5fc9f1d6
Revises: 3d9f21a7c4e2
Create Date: 2026-08-23 20:32:42.897610

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '320d5fc9f1d6'
down_revision = '3d9f21a7c4e2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('product', sa.Column('created_at', sa.DateTime(), nullable=True))
    op.add_column('product', sa.Column('edited_by', sa.String(length=100), nullable=True))
    op.add_column('product', sa.Column('edited_at', sa.DateTime(), nullable=True))
    op.add_column('product', sa.Column('image_url', sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table('product', schema=None) as batch_op:
        batch_op.drop_column('image_url')
        batch_op.drop_column('edited_at')
        batch_op.drop_column('edited_by')
        batch_op.drop_column('created_at')