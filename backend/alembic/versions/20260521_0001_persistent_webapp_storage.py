"""persistent webapp storage

Revision ID: 20260521_0001
Revises:
Create Date: 2026-05-21
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260521_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("alpha", sa.Float(), nullable=False),
        sa.Column("beta", sa.Float(), nullable=False),
        sa.Column("r_score", sa.Float(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("r_star", sa.Float(), nullable=True),
        sa.Column("exp_raw", sa.Float(), nullable=False),
        sa.Column("exp_score", sa.Float(), nullable=True),
        sa.Column("anomaly_score", sa.Float(), nullable=False),
        sa.Column("trust_score", sa.Float(), nullable=True),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lon", sa.Float(), nullable=True),
        sa.Column("location_confidence", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_users_trust", "users", ["trust_score"])
    op.create_index("idx_users_location", "users", ["lat", "lon"])

    op.create_table(
        "auth_accounts",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("disabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("email", name="uq_auth_accounts_email"),
    )

    op.create_table(
        "posts",
        sa.Column("post_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", postgresql.JSONB(), nullable=True),
        sa.Column("c_bayes", sa.Float(), nullable=True),
        sa.Column("c_ml", sa.Float(), nullable=True),
        sa.Column("c_memory", sa.Float(), nullable=True),
        sa.Column("c_final", sa.Float(), nullable=True),
        sa.Column("variance", sa.Float(), nullable=True),
        sa.Column("n_effective", sa.Float(), nullable=False),
        sa.Column("s_plus", sa.Float(), nullable=False),
        sa.Column("s_minus", sa.Float(), nullable=False),
        sa.Column("urgency", sa.Float(), nullable=True),
        sa.Column("radius", sa.Float(), nullable=False),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lon", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_posts_credibility", "posts", ["c_final"])
    op.create_index("idx_posts_created", "posts", ["created_at"])

    op.create_table(
        "interactions",
        sa.Column("interaction_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.post_id"), nullable=False),
        sa.Column("vote", sa.SmallInteger(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "post_id", name="uq_interactions_user_post"),
    )
    op.create_index("idx_interactions_post", "interactions", ["post_id"])
    op.create_index("idx_interactions_user", "interactions", ["user_id"])
    op.create_index("idx_interactions_time", "interactions", ["timestamp"])

    op.create_table(
        "user_locations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lon", sa.Float(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_user_locations_user_time", "user_locations", ["user_id", "timestamp"])

    op.create_table(
        "user_graph",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("neighbor_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("agreement_score", sa.Float(), nullable=False),
        sa.Column("time_similarity", sa.Float(), nullable=False),
        sa.Column("frequency_score", sa.Float(), nullable=False),
        sa.Column("edge_weight", sa.Float(), nullable=False),
        sa.Column("last_updated", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_graph_user", "user_graph", ["user_id"])

    op.create_table(
        "alerts",
        sa.Column("alert_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.post_id"), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("delivered", sa.Boolean(), nullable=False),
    )
    op.create_index("idx_alert_user_time", "alerts", ["user_id", "timestamp"])

    op.create_table(
        "user_alert_limits",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("alert_count", sa.Integer(), nullable=False),
        sa.Column("last_reset", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("user_alert_limits")
    op.drop_index("idx_alert_user_time", table_name="alerts")
    op.drop_table("alerts")
    op.drop_index("idx_graph_user", table_name="user_graph")
    op.drop_table("user_graph")
    op.drop_index("idx_user_locations_user_time", table_name="user_locations")
    op.drop_table("user_locations")
    op.drop_index("idx_interactions_time", table_name="interactions")
    op.drop_index("idx_interactions_user", table_name="interactions")
    op.drop_index("idx_interactions_post", table_name="interactions")
    op.drop_table("interactions")
    op.drop_index("idx_posts_created", table_name="posts")
    op.drop_index("idx_posts_credibility", table_name="posts")
    op.drop_table("posts")
    op.drop_table("auth_accounts")
    op.drop_index("idx_users_location", table_name="users")
    op.drop_index("idx_users_trust", table_name="users")
    op.drop_table("users")
