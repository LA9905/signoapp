"""
credit_note client nullable + client_name with SET NULL FK

⚠️ MIGRACIÓN INTERMEDIA (DEFENSIVA)
Se conserva solo para integridad del historial.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '06df60f98404'
down_revision = '81483af3be40'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)
    columns = [c['name'] for c in insp.get_columns('credit_note')]

    # 1️⃣ Agregar client_name solo si NO existe
    if 'client_name' not in columns:
        with op.batch_alter_table('credit_note') as batch_op:
            batch_op.add_column(
                sa.Column('client_name', sa.String(100), nullable=True)
            )

        # Poblar client_name (dialect-aware)
        dialect = bind.dialect.name
        if dialect == 'postgresql':
            op.execute("""
                UPDATE credit_note
                SET client_name = client.name
                FROM client
                WHERE credit_note.client_id = client.id
            """)
        else:
            op.execute("""
                UPDATE credit_note
                SET client_name = (
                    SELECT name FROM client WHERE id = credit_note.client_id
                )
            """)

        op.execute("""
            UPDATE credit_note
            SET client_name = 'CLIENTE ELIMINADO'
            WHERE client_name IS NULL
        """)

    # 2️⃣ Ajustes defensivos de columnas / FK
    with op.batch_alter_table('credit_note') as batch_op:
        batch_op.alter_column('client_id', nullable=True)
        batch_op.alter_column('client_name', nullable=False)

        fks = insp.get_foreign_keys('credit_note')
        fk_names = [fk['name'] for fk in fks if fk['referred_table'] == 'client']

        for fk in fk_names:
            batch_op.drop_constraint(fk, type_='foreignkey')

        batch_op.create_foreign_key(
            'credit_note_client_id_fkey',
            'client',
            ['client_id'],
            ['id'],
            ondelete='SET NULL'
        )


def downgrade():
    bind = op.get_bind()
    insp = inspect(bind)
    columns = [c['name'] for c in insp.get_columns('credit_note')]

    with op.batch_alter_table('credit_note') as batch_op:
        batch_op.drop_constraint('credit_note_client_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key(
            'credit_note_client_id_fkey',
            'client',
            ['client_id'],
            ['id']
        )
        batch_op.alter_column('client_id', nullable=False)

        if 'client_name' in columns:
            batch_op.drop_column('client_name')