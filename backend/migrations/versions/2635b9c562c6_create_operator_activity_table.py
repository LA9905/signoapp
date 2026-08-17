"""create operator_activity table

Revision ID: 2635b9c562c6
Revises: d8f8d04810ff
Create Date: 2026-08-12 18:44:27.848601

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "2635b9c562c6"
down_revision = "d8f8d04810ff"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "operator_activity",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("operator_id", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("horas", sa.Float(), nullable=False, server_default="0"),
        sa.Column("nota", sa.String(length=200), nullable=True),
        sa.Column("created_by", sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(["operator_id"], ["operator.id"]),
    )


def downgrade():
    op.drop_table("operator_activity")