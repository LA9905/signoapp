"""add notification users table

Revision ID: acc813b7bc69
Revises: 5d8ab5c676fa
Create Date: 2026-09-26 00:15:44.943521

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "acc813b7bc69"
down_revision = "5d8ab5c676fa"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)
    tables = insp.get_table_names()

    # 1) Crear user_notification si no existe (producción / entornos limpios)
    if "user_notification" not in tables:
        op.create_table(
            "user_notification",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("type", sa.String(length=40), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("meta", sa.JSON(), nullable=True),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_user_notification_user_id", "user_notification", ["user_id"], unique=False)
        op.create_index("ix_user_notification_type", "user_notification", ["type"], unique=False)
        op.create_index("ix_user_notification_is_read", "user_notification", ["is_read"], unique=False)

    # 2) Eliminar tabla vieja "notification" solo si existe (local del primer intento)
    if "notification" in tables:
        # Índices: dropear solo si existen
        existing_indexes = {ix["name"] for ix in insp.get_indexes("notification")}
        for ix_name in (
            "ix_notification_is_read",
            "ix_notification_type",
            "ix_notification_user_id",
        ):
            if ix_name in existing_indexes:
                op.drop_index(ix_name, table_name="notification")
        op.drop_table("notification")


def downgrade():
    bind = op.get_bind()
    insp = inspect(bind)
    tables = insp.get_table_names()

    # Restaurar tabla vieja solo si hace falta (rollback)
    if "notification" not in tables:
        op.create_table(
            "notification",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("type", sa.String(length=40), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("meta", sa.JSON(), nullable=True),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_notification_user_id", "notification", ["user_id"], unique=False)
        op.create_index("ix_notification_type", "notification", ["type"], unique=False)
        op.create_index("ix_notification_is_read", "notification", ["is_read"], unique=False)

    # Quitar user_notification en rollback
    if "user_notification" in tables:
        existing_indexes = {ix["name"] for ix in insp.get_indexes("user_notification")}
        for ix_name in (
            "ix_user_notification_is_read",
            "ix_user_notification_type",
            "ix_user_notification_user_id",
        ):
            if ix_name in existing_indexes:
                op.drop_index(ix_name, table_name="user_notification")
        op.drop_table("user_notification")