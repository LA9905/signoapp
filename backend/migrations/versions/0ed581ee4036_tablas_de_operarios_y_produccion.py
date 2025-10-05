"""tablas de operarios y produccion

Revision ID: 0ed581ee4036
Revises: f1d11879b5f1
Create Date: 2025-10-05 18:42:21.180976

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0ed581ee4036'
down_revision = 'f1d11879b5f1'
branch_labels = None
depends_on = None


def upgrade():
    # Crear tabla operator
    # Usamos primary_key en la columna para mayor compatibilidad entre DBs (SQLite / Postgres)
    op.create_table(
        'operator',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        # created_by se deja sin default: es información de auditoría que la app debería llenar
        sa.Column('created_by', sa.String(length=50), nullable=False),
    )

    # Crear tabla production
    # Definimos la FK directamente en la columna (sa.ForeignKey) para evitar problemas en SQLite
    op.create_table(
        'production',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('fecha', sa.DateTime(), nullable=True),
        sa.Column('operator_id', sa.Integer(), sa.ForeignKey('operator.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('created_by', sa.String(length=50), nullable=False),
    )

    # Crear tabla production_product
    op.create_table(
        'production_product',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('production_id', sa.Integer(), sa.ForeignKey('production.id', ondelete='CASCADE'), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('cantidad', sa.Float(), nullable=False),
        sa.Column('unidad', sa.String(length=20), nullable=False),
    )


def downgrade():
    # Borrar en orden inverso para respetar constraints FK
    op.drop_table('production_product')
    op.drop_table('production')
    op.drop_table('operator')