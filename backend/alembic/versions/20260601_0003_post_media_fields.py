"""post image and source url fields

Revision ID: 20260601_0003
Revises: 20260601_0002
Create Date: 2026-06-01
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260601_0003"
down_revision = "20260601_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("image_url", sa.Text(), nullable=True))
    op.add_column("posts", sa.Column("source_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("posts", "source_url")
    op.drop_column("posts", "image_url")
