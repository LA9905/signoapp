"""add paquete_numero/factura_numero/stock

Revision ID: 87ad501e0778
Revises: 41e00f18360b
Create Date: 2025-08-12 23:08:45.730641
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '87ad501e0778'
down_revision = '41e00f18360b'
branch_labels = None
depends_on = None


def upgrade():
    # --- dispatch: campos nuevos, ambos NULLABLE (ok para prod) ---
    with op.batch_alter_table('dispatch', schema=None) as batch_op:
        batch_op.add_column(sa.Column('paquete_numero', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('factura_numero', sa.String(length=50), nullable=True))

    # --- product.stock: cuidado con datos existentes en Postgres ---
    with op.batch_alter_table('product', schema=None) as batch_op:
        # 1) agregar con default para no romper filas existentes
        batch_op.add_column(
            sa.Column('stock', sa.Float(), server_default=sa.text('0'), nullable=False)
        )

    # 2) (opcional) quitar el default a futuro y dejar solo NOT NULL
    #    Esto evita que inserts futuros reciban 0 "silenciosamente".
    op.execute("ALTER TABLE product ALTER COLUMN stock DROP DEFAULT")


def downgrade():
    with op.batch_alter_table('product', schema=None) as batch_op:
        batch_op.drop_column('stock')

    with op.batch_alter_table('dispatch', schema=None) as batch_op:
        batch_op.drop_column('factura_numero')
        batch_op.drop_column('paquete_numero')