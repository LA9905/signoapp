"""add admin + subscription fields to user"""

from alembic import op
import sqlalchemy as sa

revision = 'f04c6b60e91d'
down_revision = '6744de07c514'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.add_column(sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")))
        batch_op.add_column(sa.Column("subscription_paid_until", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("due_day", sa.Integer(), nullable=False, server_default="8"))

    # limpiar server_default para futuros inserts controlados por app
    op.execute("ALTER TABLE \"user\" ALTER COLUMN is_admin DROP DEFAULT")
    op.execute("ALTER TABLE \"user\" ALTER COLUMN due_day DROP DEFAULT")

def downgrade():
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.drop_column("due_day")
        batch_op.drop_column("subscription_paid_until")
        batch_op.drop_column("is_admin")