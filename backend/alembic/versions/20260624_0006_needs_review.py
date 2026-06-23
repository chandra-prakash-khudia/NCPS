"""Add needs_review column to posts table.

Revision ID: 20260624_0006
Revises: 20260605_0004
Create Date: 2026-06-24
"""
from alembic import op
import sqlalchemy as sa

revision = '20260624_0006'
down_revision = '20260605_0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'posts',
        sa.Column('needs_review', sa.Boolean(), nullable=False, server_default='false'),
    )


def downgrade() -> None:
    op.drop_column('posts', 'needs_review')
