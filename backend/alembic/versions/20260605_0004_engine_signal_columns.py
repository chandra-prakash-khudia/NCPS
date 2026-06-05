"""engine signal columns and user request metadata

Revision ID: 20260605_0004
Revises: 20260601_0003
Create Date: 2026-06-05
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260605_0004"
down_revision = "20260601_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("graph_trust", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("coordination_score", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("location_inconsistency", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("anom_ml", sa.Float(), nullable=True))

    op.create_table(
        "user_request_metadata",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("device_id", sa.String(length=128), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_user_metadata_user_time", "user_request_metadata", ["user_id", "timestamp"])


def downgrade() -> None:
    op.drop_index("idx_user_metadata_user_time", table_name="user_request_metadata")
    op.drop_table("user_request_metadata")

    op.drop_column("users", "anom_ml")
    op.drop_column("users", "location_inconsistency")
    op.drop_column("users", "coordination_score")
    op.drop_column("users", "graph_trust")
