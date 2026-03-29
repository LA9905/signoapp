"""Add survey responses table

Revision ID: 4b19a3ca5a71
Revises: d0a266bbe1b8
Create Date: 2025-12-04 20:15:03.622843

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '4b19a3ca5a71'
down_revision = 'd0a266bbe1b8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('survey_response',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=True),
        sa.Column('email', sa.String(length=120), nullable=True),
        sa.Column('responsiva', sa.Integer(), nullable=True),
        sa.Column('estilo_colores', sa.Integer(), nullable=True),
        sa.Column('estilo_sugerencia', sa.Text(), nullable=True),
        sa.Column('cubre_necesidades', sa.Integer(), nullable=True),
        sa.Column('necesidades_faltantes', sa.Text(), nullable=True),
        sa.Column('api_estabilidad', sa.Integer(), nullable=True),
        sa.Column('velocidad_carga', sa.Integer(), nullable=True),
        sa.Column('comentarios_generales', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('survey_response', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_survey_response_token'), ['token'], unique=True)


def downgrade():
    with op.batch_alter_table('survey_response', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_survey_response_token'))

    op.drop_table('survey_response')