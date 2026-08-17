"""create dispatch_edit_log table

Revision ID: fd83b47d49f5
Revises: 2635b9c562c6
Create Date: 2026-08-13 19:21:56.893246

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fd83b47d49f5'
down_revision = '2635b9c562c6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "dispatch_edit_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dispatch_id", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.String(length=50), nullable=False),
        sa.Column("edited_by", sa.String(length=50), nullable=True),
        sa.Column("fecha", sa.DateTime(), nullable=True),
        sa.Column("motivos", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["dispatch_id"], ["dispatch.id"], ondelete="CASCADE"),
    )


def downgrade():
    op.drop_table("dispatch_edit_log")
