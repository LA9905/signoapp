from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'db0886c7bf10'
down_revision = '8a9ab7812ca5'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('dispatch', schema=None) as batch_op:
        # Agregar con server_default para no romper filas existentes
        batch_op.add_column(sa.Column('delivered_driver', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('delivered_client', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('delivered_driver_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('delivered_client_at', sa.DateTime(), nullable=True))

        # Aumentar tamaño de status (si tu autogenerate lo detectó)
        batch_op.alter_column(
            'status',
            existing_type=sa.VARCHAR(length=20),
            type_=sa.String(length=30),
            existing_nullable=True
        )

    # Quitar default en DB para que el comportamiento futuro lo controle la app
    op.execute("ALTER TABLE dispatch ALTER COLUMN delivered_driver DROP DEFAULT")
    op.execute("ALTER TABLE dispatch ALTER COLUMN delivered_client DROP DEFAULT")


def downgrade():
    with op.batch_alter_table('dispatch', schema=None) as batch_op:
        # Revertir tamaño de status
        batch_op.alter_column(
            'status',
            existing_type=sa.String(length=30),
            type_=sa.VARCHAR(length=20),
            existing_nullable=True
        )

        # Borrar columnas nuevas
        batch_op.drop_column('delivered_client_at')
        batch_op.drop_column('delivered_driver_at')
        batch_op.drop_column('delivered_client')
        batch_op.drop_column('delivered_driver')