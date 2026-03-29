"""modelos de notas de creditos

Revision ID: b067fc15be39
Revises: 0ed581ee4036
Create Date: 2025-10-05 20:52:00.032255

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b067fc15be39'
down_revision = '0ed581ee4036'
branch_labels = None
depends_on = None


def upgrade():
    # Tabla credit_note
    op.create_table(
        'credit_note',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        # FK a client.id; usamos ondelete=RESTRICT para evitar borrados accidentales de clientes que tengan notas
        sa.Column('client_id', sa.Integer(), sa.ForeignKey('client.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('order_number', sa.String(length=50), nullable=False),
        sa.Column('invoice_number', sa.String(length=50), nullable=False),
        sa.Column('credit_note_number', sa.String(length=50), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.Column('fecha', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.String(length=50), nullable=False),
    )

    # Tabla credit_note_product
    op.create_table(
        'credit_note_product',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        # FK hacia credit_note con CASCADE: si se borra la nota, sus productos relacionados se borran también.
        sa.Column('credit_note_id', sa.Integer(), sa.ForeignKey('credit_note.id', ondelete='CASCADE'), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('cantidad', sa.Float(), nullable=False),
        sa.Column('unidad', sa.String(length=20), nullable=False),
    )


def downgrade():
    # Borrar en orden inverso para respetar FK
    op.drop_table('credit_note_product')
    op.drop_table('credit_note')