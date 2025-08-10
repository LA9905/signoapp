"""Patch dispatch columns for prod (idempotent)"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text

# Ajusta estos dos según tu DAG actual
revision = '41e00f18360b'
down_revision = 'db0886c7bf10'
branch_labels = None
depends_on = None


def _colnames(bind, table):
    insp = inspect(bind)
    return {c["name"] for c in insp.get_columns(table)}


def upgrade():
    bind = op.get_bind()
    cols = _colnames(bind, "dispatch")

    # 1) created_by (string) — compat con esquemas viejos que tenían user_id (int)
    if "created_by" not in cols:
        op.add_column(
            "dispatch",
            sa.Column("created_by", sa.String(length=50), nullable=True, server_default="system"),
        )
        # Si existe user_id, copio a created_by
        if "user_id" in cols:
            op.execute(text("UPDATE dispatch SET created_by = user_id::text WHERE created_by IS NULL OR created_by = 'system'"))
        # quito default y dejo NOT NULL
        op.alter_column("dispatch", "created_by", server_default=None, existing_type=sa.String(length=50), nullable=False)

    # 2) status
    if "status" not in cols:
        op.add_column("dispatch", sa.Column("status", sa.String(length=30), nullable=False, server_default="pendiente"))
        op.alter_column("dispatch", "status", server_default=None)

    # 3) delivered flags / fechas
    if "delivered_driver" not in cols:
        op.add_column("dispatch", sa.Column("delivered_driver", sa.Boolean(), nullable=False, server_default=sa.text("false")))
        op.alter_column("dispatch", "delivered_driver", server_default=None)
    if "delivered_client" not in cols:
        op.add_column("dispatch", sa.Column("delivered_client", sa.Boolean(), nullable=False, server_default=sa.text("false")))
        op.alter_column("dispatch", "delivered_client", server_default=None)
    if "delivered_driver_at" not in cols:
        op.add_column("dispatch", sa.Column("delivered_driver_at", sa.DateTime(), nullable=True))
    if "delivered_client_at" not in cols:
        op.add_column("dispatch", sa.Column("delivered_client_at", sa.DateTime(), nullable=True))

    # (opcional) si todavía existe user_id y ya tenemos created_by funcionando, puedes decidir mantenerlo o eliminarlo
    # if "user_id" in cols:
    #     op.drop_column("dispatch", "user_id")


def downgrade():
    # Revertir solo lo estrictamente agregado (sin tocar datos existentes)
    bind = op.get_bind()
    cols = _colnames(bind, "dispatch")

    if "delivered_client_at" in cols:
        op.drop_column("dispatch", "delivered_client_at")
    if "delivered_driver_at" in cols:
        op.drop_column("dispatch", "delivered_driver_at")
    if "delivered_client" in cols:
        op.drop_column("dispatch", "delivered_client")
    if "delivered_driver" in cols:
        op.drop_column("dispatch", "delivered_driver")
    if "status" in cols:
        op.drop_column("dispatch", "status")
    # OJO: normalmente no conviene borrar created_by en downgrade
    # if "created_by" in cols:
    #     op.drop_column("dispatch", "created_by")
