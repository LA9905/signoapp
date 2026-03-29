"""Agrega client_name a Dispatch y CreditNote

Revision ID: b17f8e705134
Revises: 81483af3be40
Create Date: 2026-02-10 20:02:14.531164

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text, inspect

# revision identifiers, used by Alembic.
revision = 'b17f8e705134'
down_revision = '81483af3be40'
branch_labels = None
depends_on = None

def upgrade():
    connection = op.get_bind()
    inspector = inspect(connection)

    # --- PROCESO PARA CREDIT_NOTE ---
    if 'client_name' not in [c['name'] for c in inspector.get_columns('credit_note')]:
        op.add_column('credit_note', sa.Column('client_name', sa.String(length=100), nullable=True))
    
    # Backfill con salvaguarda para evitar NULLs
    op.execute(text("""
        UPDATE credit_note 
        SET client_name = COALESCE((SELECT name FROM client WHERE client.id = credit_note.client_id), 'Cliente Genérico')
        WHERE client_name IS NULL;
    """))
    op.alter_column('credit_note', 'client_name', nullable=False)
    op.alter_column('credit_note', 'client_id', nullable=True)

    # --- PROCESO PARA DISPATCH ---
    # 1. Asegurar que la columna existe
    if 'client_name' not in [c['name'] for c in inspector.get_columns('dispatch')]:
        op.add_column('dispatch', sa.Column('client_name', sa.String(length=100), nullable=True))
    
    # 2. Backfill: Buscamos el nombre del cliente. Si el cliente fue borrado o no existe, 
    # ponemos 'Cliente Desconocido' para que la restricción NOT NULL no falle.
    op.execute(text("""
        UPDATE dispatch 
        SET client_name = COALESCE((SELECT name FROM client WHERE client.id = dispatch.cliente_id), 'Cliente Desconocido')
        WHERE client_name IS NULL;
    """))

    # 3. Ahora que estamos seguros de que NO HAY NULLs, aplicamos NOT NULL
    op.alter_column('dispatch', 'client_name', nullable=False)

    # 4. Ajustar cliente_id (el ID opcional para SET NULL)
    op.alter_column('dispatch', 'cliente_id', nullable=True)

    # 5. Intentar actualizar la Foreign Key con seguridad
    try:
        op.drop_constraint('dispatch_cliente_id_fkey', 'dispatch', type_='foreignkey')
    except Exception:
        pass # Si no existe, no importa
    
    op.create_foreign_key('dispatch_cliente_id_fkey', 'dispatch', 'client', ['cliente_id'], ['id'], ondelete='SET NULL')


def downgrade():
    # Revertir dispatch
    op.drop_constraint('dispatch_cliente_id_fkey', 'dispatch', type_='foreignkey')
    op.create_foreign_key('dispatch_cliente_id_fkey', 'dispatch', 'client', ['cliente_id'], ['id'])
    op.alter_column('dispatch', 'cliente_id', nullable=False)
    op.drop_column('dispatch', 'client_name')

    # Revertir credit_note
    op.alter_column('credit_note', 'client_id', nullable=False)
    op.drop_column('credit_note', 'client_name')