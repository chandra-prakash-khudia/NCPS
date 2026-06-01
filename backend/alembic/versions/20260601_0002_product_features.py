"""product feature expansion

Revision ID: 20260601_0002
Revises: 20260521_0001
Create Date: 2026-06-01
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260601_0002"
down_revision = "20260521_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("auth_accounts", sa.Column("auth_provider", sa.String(length=32), nullable=False, server_default="password"))
    op.add_column("auth_accounts", sa.Column("google_subject", sa.String(length=128), nullable=True))
    op.add_column("auth_accounts", sa.Column("avatar_url", sa.Text(), nullable=True))
    op.alter_column("auth_accounts", "password_hash", nullable=True)
    op.create_unique_constraint("uq_auth_accounts_google_subject", "auth_accounts", ["google_subject"])

    op.add_column("users", sa.Column("city", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("country", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("points", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("current_daily_streak", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("current_weekly_streak", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("best_daily_streak", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("best_weekly_streak", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("last_activity_date", sa.DateTime(timezone=True), nullable=True))
    op.create_index("idx_users_city_trust", "users", ["city", "trust_score"])

    op.add_column("posts", sa.Column("category", sa.String(length=32), nullable=False, server_default="other"))
    op.add_column("posts", sa.Column("is_global", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("posts", sa.Column("shares_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("posts", sa.Column("bookmarks_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("posts", sa.Column("reports_count", sa.Integer(), nullable=False, server_default="0"))
    op.create_index("idx_posts_category_created", "posts", ["category", "created_at"])
    op.create_index("idx_posts_global", "posts", ["is_global"])

    op.add_column("alerts", sa.Column("alert_type", sa.String(length=32), nullable=False, server_default="hyperlocal"))
    op.add_column("alerts", sa.Column("title", sa.String(length=160), nullable=False, server_default="NCPS Alert"))
    op.add_column("alerts", sa.Column("message", sa.String(length=500), nullable=False, server_default=""))
    op.add_column("alerts", sa.Column("category", sa.String(length=32), nullable=True))
    op.add_column("alerts", sa.Column("distance_m", sa.Float(), nullable=True))
    op.add_column("alerts", sa.Column("proximity", sa.Float(), nullable=True))
    op.add_column("alerts", sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("alerts", sa.Column("read_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("alerts", sa.Column("metadata_json", postgresql.JSONB(), nullable=True))
    op.create_index("idx_alert_user_read_time", "alerts", ["user_id", "is_read", "timestamp"])

    op.create_table(
        "user_preferences",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("followed_topics", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("alerts_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("breaking_only", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("alert_radius_m", sa.Float(), nullable=False, server_default="1000"),
        sa.Column("feed_radius_m", sa.Float(), nullable=False, server_default="10000"),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "bookmarks",
        sa.Column("bookmark_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "post_id", name="uq_bookmarks_user_post"),
    )
    op.create_index("idx_bookmarks_user_created", "bookmarks", ["user_id", "created_at"])

    op.create_table(
        "content_reports",
        sa.Column("report_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("reporter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False),
        sa.Column("reason", sa.String(length=64), nullable=False, server_default="other"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("reporter_id", "post_id", "status", name="uq_content_reports_open"),
    )
    op.create_index("idx_content_reports_status_created", "content_reports", ["status", "created_at"])

    op.create_table(
        "web_push_subscriptions",
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh", sa.Text(), nullable=True),
        sa.Column("auth", sa.Text(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "endpoint", name="uq_push_user_endpoint"),
    )
    op.create_index("idx_push_user_enabled", "web_push_subscriptions", ["user_id", "enabled"])

    op.create_table(
        "observability_events",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_observability_type_time", "observability_events", ["event_type", "created_at"])


def downgrade() -> None:
    op.drop_index("idx_observability_type_time", table_name="observability_events")
    op.drop_table("observability_events")
    op.drop_index("idx_push_user_enabled", table_name="web_push_subscriptions")
    op.drop_table("web_push_subscriptions")
    op.drop_index("idx_content_reports_status_created", table_name="content_reports")
    op.drop_table("content_reports")
    op.drop_index("idx_bookmarks_user_created", table_name="bookmarks")
    op.drop_table("bookmarks")
    op.drop_table("user_preferences")

    op.drop_index("idx_alert_user_read_time", table_name="alerts")
    op.drop_column("alerts", "metadata_json")
    op.drop_column("alerts", "read_at")
    op.drop_column("alerts", "is_read")
    op.drop_column("alerts", "proximity")
    op.drop_column("alerts", "distance_m")
    op.drop_column("alerts", "category")
    op.drop_column("alerts", "message")
    op.drop_column("alerts", "title")
    op.drop_column("alerts", "alert_type")

    op.drop_index("idx_posts_global", table_name="posts")
    op.drop_index("idx_posts_category_created", table_name="posts")
    op.drop_column("posts", "reports_count")
    op.drop_column("posts", "bookmarks_count")
    op.drop_column("posts", "shares_count")
    op.drop_column("posts", "is_global")
    op.drop_column("posts", "category")

    op.drop_index("idx_users_city_trust", table_name="users")
    op.drop_column("users", "last_activity_date")
    op.drop_column("users", "best_weekly_streak")
    op.drop_column("users", "best_daily_streak")
    op.drop_column("users", "current_weekly_streak")
    op.drop_column("users", "current_daily_streak")
    op.drop_column("users", "points")
    op.drop_column("users", "country")
    op.drop_column("users", "city")

    op.drop_constraint("uq_auth_accounts_google_subject", "auth_accounts", type_="unique")
    op.alter_column("auth_accounts", "password_hash", nullable=False)
    op.drop_column("auth_accounts", "avatar_url")
    op.drop_column("auth_accounts", "google_subject")
    op.drop_column("auth_accounts", "auth_provider")
