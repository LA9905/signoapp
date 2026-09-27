"""survey campaign fields and ratings

Revision ID: 7087480c734b
Revises: acc813b7bc69
Create Date: 2026-09-27 00:10:08.118570

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "7087480c734b"
down_revision = "acc813b7bc69"
branch_labels = None
depends_on = None


def _cols(table: str) -> set[str]:
    bind = op.get_bind()
    return {c["name"] for c in inspect(bind).get_columns(table)}


def upgrade():
    existing = _cols("survey_response")

    with op.batch_alter_table("survey_response", schema=None) as batch_op:
        if "user_id" not in existing:
            batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
        if "campaign_key" not in existing:
            batch_op.add_column(sa.Column("campaign_key", sa.String(length=40), nullable=True))
        if "completed" not in existing:
            batch_op.add_column(sa.Column("completed", sa.Boolean(), nullable=True))
        if "last_email_sent_at" not in existing:
            batch_op.add_column(sa.Column("last_email_sent_at", sa.DateTime(timezone=True), nullable=True))
        if "claridad_ui" not in existing:
            batch_op.add_column(sa.Column("claridad_ui", sa.Integer(), nullable=True))
        if "intuitiva" not in existing:
            batch_op.add_column(sa.Column("intuitiva", sa.Integer(), nullable=True))
        if "equipo_atencion" not in existing:
            batch_op.add_column(sa.Column("equipo_atencion", sa.Integer(), nullable=True))
        if "equipo_errores" not in existing:
            batch_op.add_column(sa.Column("equipo_errores", sa.Integer(), nullable=True))
        if "equipo_responsabilidad" not in existing:
            batch_op.add_column(sa.Column("equipo_responsabilidad", sa.Integer(), nullable=True))
        if "novedades_informadas" not in existing:
            batch_op.add_column(sa.Column("novedades_informadas", sa.Integer(), nullable=True))
        if "satisfaccion_general" not in existing:
            batch_op.add_column(sa.Column("satisfaccion_general", sa.Integer(), nullable=True))
        if "ideas_tecnologia" not in existing:
            batch_op.add_column(sa.Column("ideas_tecnologia", sa.Text(), nullable=True))
        if "errores_actuales" not in existing:
            batch_op.add_column(sa.Column("errores_actuales", sa.Text(), nullable=True))
        if "completed_at" not in existing:
            batch_op.add_column(sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))

    # Filas antiguas (PostgreSQL local y Render)
    op.execute(
        sa.text("UPDATE survey_response SET campaign_key = 'legacy' WHERE campaign_key IS NULL")
    )
    op.execute(
        sa.text("UPDATE survey_response SET completed = false WHERE completed IS NULL")
    )

    with op.batch_alter_table("survey_response", schema=None) as batch_op:
        batch_op.alter_column(
            "campaign_key",
            existing_type=sa.String(length=40),
            nullable=False,
            server_default="legacy",
        )
        batch_op.alter_column(
            "completed",
            existing_type=sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        )

        # Índices (si ya existen, en un segundo intento fallaría; en DB limpia/Render ok)
        try:
            batch_op.create_index(
                batch_op.f("ix_survey_response_campaign_key"),
                ["campaign_key"],
                unique=False,
            )
        except Exception:
            pass
        try:
            batch_op.create_index(
                batch_op.f("ix_survey_response_completed"),
                ["completed"],
                unique=False,
            )
        except Exception:
            pass
        try:
            batch_op.create_index(
                batch_op.f("ix_survey_response_user_id"),
                ["user_id"],
                unique=False,
            )
        except Exception:
            pass

        try:
            batch_op.create_foreign_key(
                "fk_survey_response_user_id",
                "user",
                ["user_id"],
                ["id"],
                ondelete="SET NULL",
            )
        except Exception:
            pass


def downgrade():
    with op.batch_alter_table("survey_response", schema=None) as batch_op:
        try:
            batch_op.drop_constraint("fk_survey_response_user_id", type_="foreignkey")
        except Exception:
            pass
        try:
            batch_op.drop_index(batch_op.f("ix_survey_response_user_id"))
        except Exception:
            pass
        try:
            batch_op.drop_index(batch_op.f("ix_survey_response_completed"))
        except Exception:
            pass
        try:
            batch_op.drop_index(batch_op.f("ix_survey_response_campaign_key"))
        except Exception:
            pass
        for col in (
            "completed_at",
            "errores_actuales",
            "ideas_tecnologia",
            "satisfaccion_general",
            "novedades_informadas",
            "equipo_responsabilidad",
            "equipo_errores",
            "equipo_atencion",
            "intuitiva",
            "claridad_ui",
            "last_email_sent_at",
            "completed",
            "campaign_key",
            "user_id",
        ):
            try:
                batch_op.drop_column(col)
            except Exception:
                pass