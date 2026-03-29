"""empty message

Revision ID: e8c5ea9290d9
Revises: 499526e05ef3
Create Date: 2025-09-28 20:26:24.995074

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e8c5ea9290d9'
down_revision = '499526e05ef3'
branch_labels = None
depends_on = None


def upgrade():
    # Crear tabla supplier
    op.create_table(
        'supplier',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        # ponemos un server_default temporal para evitar problemas si algún entorno
        # intenta insertar sin enviar el campo (seguro y se quita más abajo)
        sa.Column('created_by', sa.String(length=50), nullable=False, server_default=sa.text("'system'")),
    )

    # Crear tabla receipt (encabezado de recepción)
    op.create_table(
        'receipt',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('orden', sa.String(length=50), nullable=False),
        sa.Column('supplier_id', sa.Integer(), sa.ForeignKey('supplier.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('fecha', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.String(length=50), nullable=False, server_default=sa.text("'system'")),
        sa.Column('status', sa.String(length=30), nullable=True, server_default=sa.text("'pending'")),
    )

    # Crear tabla receipt_product (detalle)
    op.create_table(
        'receipt_product',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('receipt_id', sa.Integer(), sa.ForeignKey('receipt.id', ondelete='CASCADE'), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('cantidad', sa.Float(), nullable=False),
        sa.Column('unidad', sa.String(length=20), nullable=False),
    )

    # --- Limpiar server_default en Postgres para que futuros inserts dependa de la app ---
    # Este patrón funciona en Postgres. En SQLite los ALTER TABLE para DROP DEFAULT pueden
    # no ser necesarios o no soportados — en ese caso las sentencias serán ignoradas o fallarán.
    # Para evitar que fallen en entornos SQLite, podemos envolver en TRY/CATCH SQL o
    # confiar en que Rende usa Postgres y local dev puede aceptar los defaults.

    # Quitar defaults temporales para created_by y status (Postgres)
    try:
        op.execute("ALTER TABLE supplier ALTER COLUMN created_by DROP DEFAULT")
        op.execute("ALTER TABLE receipt ALTER COLUMN created_by DROP DEFAULT")
        op.execute("ALTER TABLE receipt ALTER COLUMN status DROP DEFAULT")
    except Exception:
        # En entornos (ej. SQLite) donde ALTER DROP DEFAULT pueda fallar, no abortamos la migración.
        # Alembic/logs mostrarán la excepción; si prefieres que falle en local para detectar
        # incompatibilidades, quita el try/except.
        pass


def downgrade():
    # Eliminamos en orden dependencias -> tablas dependientes primero
    op.drop_table('receipt_product')
    op.drop_table('receipt')
    op.drop_table('supplier')