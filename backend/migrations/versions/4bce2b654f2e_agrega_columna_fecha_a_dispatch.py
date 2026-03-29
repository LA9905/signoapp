"""agrega columna fecha a dispatch

Revision ID: 4bce2b654f2e
Revises: b17f8e705134
Create Date: 2026-02-10 22:11:33.658904

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text, inspect

# revision identifiers, used by Alembic.
revision = '4bce2b654f2e'
down_revision = 'b17f8e705134'
branch_labels = None
depends_on = None

def upgrade():
    connection = op.get_bind()
    inspector = inspect(connection)
    
    # 1. Manejo seguro de la columna 'fecha' en dispatch
    if 'fecha' not in [c['name'] for c in inspector.get_columns('dispatch')]:
        # Creamos como nullable primero
        op.add_column('dispatch', sa.Column('fecha', sa.DateTime(), nullable=True))
        
        # Llenamos registros vacíos con la hora actual (NOW() funciona en Postgres/Render)
        # Para local (SQLite), NOW() no existe, usamos CURRENT_TIMESTAMP
        if connection.engine.dialect.name == 'postgresql':
            op.execute(text("UPDATE dispatch SET fecha = NOW() WHERE fecha IS NULL"))
        else:
            op.execute(text("UPDATE dispatch SET fecha = CURRENT_TIMESTAMP WHERE fecha IS NULL"))
            
        # Ahora sí, la hacemos obligatoria
        op.alter_column('dispatch', 'fecha', nullable=False)

    # 2. Limpieza de cliente_name (SOLO si existe la columna vieja por algún residuo)
    if 'cliente_name' in [c['name'] for c in inspector.get_columns('dispatch')]:
        op.drop_column('dispatch', 'cliente_name')

    # 3. Asegurar consistencia en credit_note (SET NULL)
    # No forzamos nullable=False aquí para evitar errores si se borra un cliente
    op.alter_column('credit_note', 'client_id', nullable=True)


def downgrade():
    with op.batch_alter_table('dispatch', schema=None) as batch_op:
        batch_op.drop_column('fecha')
        batch_op.add_column(sa.Column('cliente_name', sa.String(length=100), nullable=True))

    with op.batch_alter_table('credit_note', schema=None) as batch_op:
        batch_op.alter_column('client_id', nullable=False)