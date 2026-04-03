"""add gender to user

Revision ID: c8e9317427fd
Revises: 8569e15d0049
Create Date: 2026-04-03 12:53:34.418209

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c8e9317427fd'
down_revision = '8569e15d0049'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        with op.batch_alter_table('user', schema=None) as batch_op:
            batch_op.add_column(sa.Column('gender', sa.String(length=1), nullable=True))
    else:
        op.add_column('user', sa.Column('gender', sa.String(length=1), nullable=True))


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        with op.batch_alter_table('user', schema=None) as batch_op:
            batch_op.drop_column('gender')
    else:
        op.drop_column('user', 'gender')