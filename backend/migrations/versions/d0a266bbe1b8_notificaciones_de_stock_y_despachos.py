"""notificaciones de stock y despachos

Revision ID: d0a266bbe1b8
Revises: 760bba37cbb2
Create Date: 2025-10-16 23:33:48.777971
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = 'd0a266bbe1b8'
down_revision = '760bba37cbb2'
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    # Verificar si la tabla no existe antes de agregarla
    if not insp.has_table('user'):
        raise ValueError("La tabla 'user' no existe, no se puede agregar la columna.")
    
    columns = [col['name'] for col in insp.get_columns('user')]
    if 'receive_notifications' not in columns:
        with op.batch_alter_table('user', schema=None) as batch_op:
            batch_op.add_column(sa.Column('receive_notifications', sa.Boolean(), nullable=False, server_default='true'))
        # Actualizar usuarios existentes a receive_notifications=True
        op.execute('UPDATE "user" SET receive_notifications = TRUE')

def downgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    # Verificar si la columna existe antes de eliminarla
    if insp.has_table('user'):
        columns = [col['name'] for col in insp.get_columns('user')]
        if 'receive_notifications' in columns:
            with op.batch_alter_table('user', schema=None) as batch_op:
                batch_op.drop_column('receive_notifications')