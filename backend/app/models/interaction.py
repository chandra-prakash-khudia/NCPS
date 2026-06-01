"""
Interaction, UserLocation, UserGraph, and Alert models.
Schema source: docs/context/database_design.md §3.3–3.7
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Float,
    Integer,
    String,
    SmallInteger,
    DateTime,
    Index,
    ForeignKey,
    JSON,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Interaction(Base):
    """Records each user vote on a post."""

    __tablename__ = "interactions"

    interaction_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("posts.post_id"), nullable=False
    )
    vote: Mapped[int] = mapped_column(SmallInteger, nullable=False, doc="+1 or -1")
    weight: Mapped[float | None] = mapped_column(Float, nullable=True, doc="w_i at time of vote")
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_interactions_user_post"),
        Index("idx_interactions_post", "post_id"),
        Index("idx_interactions_user", "user_id"),
        Index("idx_interactions_time", "timestamp"),
    )

    def __repr__(self) -> str:
        return f"<Interaction {self.user_id}→{self.post_id} vote={self.vote}>"


class UserLocation(Base):
    """Historical location samples for computing spatial signals."""

    __tablename__ = "user_locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False
    )
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        Index("idx_user_locations_user_time", "user_id", "timestamp"),
    )


class UserGraph(Base):
    """Adjacency table for the user interaction graph (Phase 3 ready)."""

    __tablename__ = "user_graph"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True
    )
    neighbor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True
    )
    agreement_score: Mapped[float] = mapped_column(Float, default=0.0)
    time_similarity: Mapped[float] = mapped_column(Float, default=0.0)
    frequency_score: Mapped[float] = mapped_column(Float, default=0.0)
    edge_weight: Mapped[float] = mapped_column(Float, default=0.0)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        Index("idx_graph_user", "user_id"),
    )


class Alert(Base):
    """Alerts sent to users about credible, urgent, nearby posts."""

    __tablename__ = "alerts"

    alert_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("posts.post_id"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    delivered: Mapped[bool] = mapped_column(Boolean, default=False)
    alert_type: Mapped[str] = mapped_column(String(32), default="hyperlocal", nullable=False)
    title: Mapped[str] = mapped_column(String(160), default="NCPS Alert", nullable=False)
    message: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    category: Mapped[str | None] = mapped_column(String(32), nullable=True)
    distance_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    proximity: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )

    __table_args__ = (
        Index("idx_alert_user_time", "user_id", "timestamp"),
        Index("idx_alert_user_read_time", "user_id", "is_read", "timestamp"),
    )


class UserAlertLimit(Base):
    """Rate-limiting table for user alerts."""

    __tablename__ = "user_alert_limits"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True
    )
    alert_count: Mapped[int] = mapped_column(Integer, default=0)
    last_reset: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
