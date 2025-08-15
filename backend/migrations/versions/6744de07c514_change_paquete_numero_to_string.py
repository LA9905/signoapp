"""change paquete_numero to String

Revision ID: 6744de07c514
Revises: 87ad501e0778
Create Date: 2025-08-15 15:35:55.260834

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '6744de07c514'
down_revision = '87ad501e0778'
branch_labels = None
depends_on = None


def upgrade():
    # En PostgreSQL, especificamos cómo castear el INTEGER a TEXT
    # En SQLite u otros, Alembic ignorará el parámetro postgresql_using.
    with op.batch_alter_table('dispatch', schema=None) as batch_op:
        batch_op.alter_column(
            'paquete_numero',
            existing_type=sa.INTEGER(),
            type_=sa.String(length=50),
            existing_nullable=True,
            postgresql_using='paquete_numero::text'
        )


def downgrade():
    # ¡Atención! Esto fallará si hay valores no numéricos (ej. '1/4').
    # Es normal: bajar a INTEGER es más restrictivo.
    with op.batch_alter_table('dispatch', schema=None) as batch_op:
        batch_op.alter_column(
            'paquete_numero',
            existing_type=sa.String(length=50),
            type_=sa.INTEGER(),
            existing_nullable=True,
            postgresql_using='paquete_numero::integer'
        )