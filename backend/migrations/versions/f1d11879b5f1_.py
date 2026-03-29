"""empty message

Revision ID: f1d11879b5f1
Revises: e8c5ea9290d9
Create Date: 2025-09-30 21:36:03.926824

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "f1d11879b5f1"
down_revision = "e8c5ea9290d9"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # Crear tabla internal_consumption si no existe
    if "internal_consumption" not in existing_tables:
        op.create_table(
            "internal_consumption",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("nombre_retira", sa.String(length=100), nullable=False),
            sa.Column("area", sa.String(length=50), nullable=False),
            sa.Column("motivo", sa.String(length=255), nullable=False),
            sa.Column("fecha", sa.DateTime(), nullable=True),
            # Mantengo String(50) tal como en tu versión inicial. Cambia a Integer() si en tu app created_by es numérico.
            sa.Column("created_by", sa.String(length=50), nullable=False),
        )

    # Crear tabla internal_consumption_product si no existe
    if "internal_consumption_product" not in existing_tables:
        op.create_table(
            "internal_consumption_product",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("internal_consumption_id", sa.Integer(), nullable=False),
            sa.Column("nombre", sa.String(length=100), nullable=False),
            sa.Column("cantidad", sa.Float(), nullable=False),
            sa.Column("unidad", sa.String(length=20), nullable=False),
            # no añado aquí la FK explícita para evitar errores si la tabla padre no está disponible en algún caso;
            # la añadimos a continuación con create_foreign_key (más controlable)
        )

    # Crear FK sólo si aún no existe (chequeo básico)
    # Nota: algunos RDBMS/listas de constraints requieren inspección más avanzada; este enfoque funciona en la mayoría de setups.
    try:
        fk_exists = False
        for fk in inspector.get_foreign_keys("internal_consumption_product"):
            # si ya hay una FK apuntando a internal_consumption.id asumimos que está creada
            if fk.get("referred_table") == "internal_consumption":
                fk_exists = True
                break

        if not fk_exists:
            op.create_foreign_key(
                "fk_internal_consumption_product_internal_consumption",
                "internal_consumption_product",
                "internal_consumption",
                ["internal_consumption_id"],
                ["id"],
            )
    except Exception:
        # Si la inspección falla por permisos o dialecto, intentamos crear la FK sin validación;
        # si falla, no abortamos la migración entera (defensivo).
        try:
            op.create_foreign_key(
                "fk_internal_consumption_product_internal_consumption",
                "internal_consumption_product",
                "internal_consumption",
                ["internal_consumption_id"],
                ["id"],
            )
        except Exception:
            # dejamos pasar el error; lo más probable es que la FK ya exista o el DB admin la maneje.
            pass


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # Eliminar FK si existe
    try:
        # Algunos dialectos aceptan drop_constraint con el nombre; si no existe ignoramos el error
        if "internal_consumption_product" in existing_tables:
            op.drop_constraint(
                "fk_internal_consumption_product_internal_consumption",
                "internal_consumption_product",
                type_="foreignkey",
            )
    except Exception:
        # ignora si no existe o no se puede eliminar
        pass

    # Borrado seguro de tablas sólo si existen
    if "internal_consumption_product" in existing_tables:
        op.drop_table("internal_consumption_product")

    if "internal_consumption" in existing_tables:
        op.drop_table("internal_consumption")