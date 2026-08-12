"""create auto_delivered migration

Revision ID: bdace00ee26a
Revises: ea5209044dd6
Create Date: 2026-08-04 20:06:19.326650

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bdace00ee26a'
down_revision = 'ea5209044dd6'
branch_labels = None
depends_on = None


def _has_column(table_name, column_name):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = [c["name"] for c in insp.get_columns(table_name)]
    return column_name in cols


def upgrade():
    # Idempotente: si la columna ya existe (p.ej. un deploy anterior que se
    # reintentó en Render), no intenta crearla de nuevo.
    if _has_column('dispatch', 'auto_delivered'):
        return

    with op.batch_alter_table('dispatch', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('auto_delivered', sa.Boolean(), nullable=False, server_default=sa.false())
        )
        # Quitamos el server_default después de rellenar las filas existentes,
        # para que quede igual que si la columna se hubiera creado desde cero
        # (el default en Python del modelo sigue aplicando en nuevos inserts).
        batch_op.alter_column(
            'auto_delivered',
            existing_type=sa.Boolean(),
            server_default=None,
        )


def downgrade():
    if not _has_column('dispatch', 'auto_delivered'):
        return

    with op.batch_alter_table('dispatch', schema=None) as batch_op:
        batch_op.drop_column('auto_delivered')