"""aceptación de términos y tratamiento de datos en users

Revision ID: a1c3e5f7b902
Revises: 740b7aff031f
Create Date: 2026-11-23 19:45:00

"""
from alembic import op
import sqlalchemy as sa


revision = 'a1c3e5f7b902'
down_revision = '740b7aff031f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('terms_accepted_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('terms_version', sa.String(length=20), server_default='', nullable=False))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('terms_version')
        batch_op.drop_column('terms_accepted_at')
