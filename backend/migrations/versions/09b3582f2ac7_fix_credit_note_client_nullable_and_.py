"""
Migración CANÓNICA para credit_note

Estado final:
- client_id nullable
- client_name NOT NULL con fallback
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '09b3582f2ac7'
down_revision = '06df60f98404'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)
    columns = [c['name'] for c in insp.get_columns('credit_note')]

    # 1️⃣ Agregar client_name solo si no existe
    if 'client_name' not in columns:
        with op.batch_alter_table('credit_note') as batch_op:
            batch_op.add_column(
                sa.Column('client_name', sa.String(100), nullable=True)
            )

    # 2️⃣ Poblar valores (si hay NULLs)
    dialect = bind.dialect.name
    if dialect == 'postgresql':
        op.execute("""
            UPDATE credit_note
            SET client_name = client.name
            FROM client
            WHERE credit_note.client_id = client.id
              AND credit_note.client_name IS NULL
        """)
    else:
        op.execute("""
            UPDATE credit_note
            SET client_name = (
                SELECT name FROM client WHERE id = credit_note.client_id
            )
            WHERE client_name IS NULL
        """)

    op.execute("""
        UPDATE credit_note
        SET client_name = 'CLIENTE ELIMINADO'
        WHERE client_name IS NULL
    """)

    # 3️⃣ Estado final
    with op.batch_alter_table('credit_note') as batch_op:
        batch_op.alter_column('client_name', nullable=False)
        batch_op.alter_column('client_id', nullable=True)


def downgrade():
    bind = op.get_bind()
    insp = inspect(bind)
    columns = [c['name'] for c in insp.get_columns('credit_note')]

    with op.batch_alter_table('credit_note') as batch_op:
        batch_op.alter_column('client_id', nullable=False)

        if 'client_name' in columns:
            batch_op.drop_column('client_name')