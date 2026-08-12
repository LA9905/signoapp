"""add photo_url a operator, tabla operator_activity

Revision ID: d8f8d04810ff
Revises: bdace00ee26a
Create Date: 2026-08-11 20:37:04.746549

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d8f8d04810ff"
down_revision = "bdace00ee26a"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "operator",
        sa.Column(
            "photo_url",
            sa.String(length=300),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("operator", "photo_url")