"""add supplier_name and nullable supplier_id to receipt

Revision ID: 352af3e85112
Revises: c8e9317427fd
Create Date: 2026-04-03 13:46:04.683209

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '352af3e85112'
down_revision = 'c8e9317427fd'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        with op.batch_alter_table('receipt', schema=None) as batch_op:
            batch_op.add_column(sa.Column('supplier_name', sa.String(length=100), nullable=True))
            batch_op.alter_column('supplier_id', existing_type=sa.Integer(), nullable=True)
    else:
        op.add_column('receipt', sa.Column('supplier_name', sa.String(length=100), nullable=True))
        op.alter_column('receipt', 'supplier_id', existing_type=sa.Integer(), nullable=True)

    op.execute("""
        UPDATE receipt
        SET supplier_name = (SELECT name FROM supplier WHERE supplier.id = receipt.supplier_id)
        WHERE supplier_name IS NULL AND supplier_id IS NOT NULL
    """)


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        with op.batch_alter_table('receipt', schema=None) as batch_op:
            batch_op.drop_column('supplier_name')
            batch_op.alter_column('supplier_id', existing_type=sa.Integer(), nullable=False)
    else:
        op.drop_column('receipt', 'supplier_name')
        op.alter_column('receipt', 'supplier_id', existing_type=sa.Integer(), nullable=False)