"""
User model — maps to the `users` table.
Schema source: docs/context/database_design.md §3.1
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Float, DateTime, Index, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class User(Base):
    """Stores per-user state: reliability, experience, anomaly, trust, and location."""

    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Reliability (Formula 1) ──
    alpha: Mapped[float] = mapped_column(Float, default=0.0, doc="Time-decayed correct action count")
    beta: Mapped[float] = mapped_column(Float, default=0.0, doc="Time-decayed incorrect action count")
    r_score: Mapped[float | None] = mapped_column(Float, nullable=True, doc="R_i = α / (α + β)")
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True, doc="Conf_i = 1 - exp(-k*(α+β))")
    r_star: Mapped[float | None] = mapped_column(Float, nullable=True, doc="R_i* = R_i × Conf_i")

    # ── Experience (Formula 2) ──
    exp_raw: Mapped[float] = mapped_column(Float, default=0.0, doc="E_i(t) raw accumulation")
    exp_score: Mapped[float | None] = mapped_column(Float, nullable=True, doc="Exp_i ∈ [0,1]")

    # ── Anomaly (Formula 3) ──
    anomaly_score: Mapped[float] = mapped_column(Float, default=0.0, doc="Anom_i ∈ [0,1]")

    # ── Trust (Formula 4 — equals R_i* in MVP, graph-propagated in Phase 3) ──
    trust_score: Mapped[float | None] = mapped_column(Float, nullable=True, doc="T_i ∈ [0,1]")

    # ── Location ──
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_confidence: Mapped[float] = mapped_column(Float, default=0.5, doc="L_i ∈ [0,1]")

    # ── Graph (Phase 3) ──
    graph_trust: Mapped[float | None] = mapped_column(Float, nullable=True, doc="Graph-propagated T_i")
    coordination_score: Mapped[float | None] = mapped_column(Float, nullable=True, doc="D₄ coordination")

    # ── Spatial anomaly (Phase 4) ──
    location_inconsistency: Mapped[float | None] = mapped_column(Float, nullable=True, doc="D₅ location inconsistency")

    # ── ML anomaly (Phase 5 — placeholder for future ML integration) ──
    anom_ml: Mapped[float | None] = mapped_column(Float, nullable=True, doc="Anom_ML ∈ [0,1]")

    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    country: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # ── Engagement / gamification metadata (does not affect scoring) ──
    points: Mapped[int] = mapped_column(Integer, default=0)
    current_daily_streak: Mapped[int] = mapped_column(Integer, default=0)
    current_weekly_streak: Mapped[int] = mapped_column(Integer, default=0)
    best_daily_streak: Mapped[int] = mapped_column(Integer, default=0)
    best_weekly_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_activity_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Metadata ──
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("idx_users_trust", "trust_score"),
        Index("idx_users_location", "lat", "lon"),
        Index("idx_users_city_trust", "city", "trust_score"),
    )

    def __repr__(self) -> str:
        return f"<User {self.user_id} R*={self.r_star} T={self.trust_score}>"
