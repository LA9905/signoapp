"""Make client_id nullable in credit_note

Revision ID: 90eceacff6d1
Revises: 4bce2b654f2e
Create Date: 2026-02-10 23:48:50.317173

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '90eceacff6d1'
down_revision = '4bce2b654f2e'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the existing foreign key constraint
    op.drop_constraint('credit_note_client_id_fkey', 'credit_note', type_='foreignkey')
    
    # Alter the column to make it nullable
    op.alter_column('credit_note', 'client_id',
               existing_type=sa.Integer(),
               nullable=True)
    
    # Create new foreign key with ondelete='SET NULL'
    op.create_foreign_key('credit_note_client_id_fkey', 'credit_note', 'client',
                          ['client_id'], ['id'], ondelete='SET NULL')


def downgrade():
    # Drop the foreign key
    op.drop_constraint('credit_note_client_id_fkey', 'credit_note', type_='foreignkey')
    
    # Alter column back to non-nullable
    op.alter_column('credit_note', 'client_id',
               existing_type=sa.Integer(),
               nullable=False)
    
    # Recreate original foreign key without ondelete
    op.create_foreign_key('credit_note_client_id_fkey', 'credit_note', 'client',
                          ['client_id'], ['id'])