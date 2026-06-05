"""
Background Signal Pipeline — computes expensive signals periodically.

Runs graph trust propagation (signals 6, 8), spatial recomputation (signals 7, 9),
extended signal computation (signals 10-14), and leaves hooks for ML integration.

Started as a daemon thread from the webapp lifespan.
"""

from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone

from sqlalchemy.orm import Session, sessionmaker

from app.engine.graph_engine import GraphState, VoteRecord, run_graph_pipeline
from app.engine.signal_engine import ExtendedSignals, compute_all_extended_signals
from app.engine.spatial import (
    LocationRecord,
    compute_location_confidence,
    compute_location_inconsistency,
)
from app.models.interaction import Interaction, UserLocation
from app.models.user import User
from webapp.models import UserRequestMetadata

logger = logging.getLogger(__name__)


def _ensure_utc(dt: datetime | None) -> datetime:
    """Ensure a datetime is timezone-aware (UTC). SQLite returns naive datetimes."""
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class BackgroundPipeline:
    """Periodically recomputes heavy signals in a background daemon thread."""

    def __init__(
        self,
        session_factory: sessionmaker[Session],
        interval_seconds: int = 60,
    ) -> None:
        self._session_factory = session_factory
        self._interval = interval_seconds
        self._running = False
        self._thread: threading.Thread | None = None
        self.user_signals: dict[str, ExtendedSignals] = {}

    def start(self) -> None:
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        logger.info("Background pipeline started (interval=%ds)", self._interval)

    def stop(self) -> None:
        self._running = False
        logger.info("Background pipeline stop requested")

    def _loop(self) -> None:
        while self._running:
            try:
                self._run_cycle()
            except Exception:
                logger.exception("Unhandled error in pipeline loop")
            time.sleep(self._interval)

    def _run_cycle(self) -> None:
        session = self._session_factory()
        try:
            self._run_graph(session)
            self._run_spatial(session)
            self._run_extended_signals(session)
            self._run_ml_placeholder(session)
            session.commit()
        except Exception:
            session.rollback()
            logger.exception("Pipeline cycle failed")
        finally:
            session.close()

    # ── Signal 6 (D₄ coordination) + Signal 8 (graph trust) ──

    def _run_graph(self, session: Session) -> None:
        try:
            users = session.query(User).all()
            interactions = session.query(Interaction).all()

            r_star_scores: dict[str, float] = {}
            for u in users:
                uid = str(u.user_id)
                r_star_scores[uid] = u.r_star if u.r_star is not None else 0.5

            vote_records = [
                VoteRecord(
                    user_id=str(ix.user_id),
                    post_id=str(ix.post_id),
                    vote=ix.vote,
                    timestamp=_ensure_utc(ix.timestamp),
                )
                for ix in interactions
            ]

            if len(vote_records) < 3:
                logger.debug("Graph pipeline skipped: only %d vote records", len(vote_records))
                return

            state: GraphState = run_graph_pipeline(vote_records, r_star_scores)

            for u in users:
                uid = str(u.user_id)
                u.trust_score = state.trust_scores.get(uid, u.trust_score)
                if hasattr(u, "graph_trust"):
                    u.graph_trust = state.trust_scores.get(uid)
                if hasattr(u, "coordination_score"):
                    u.coordination_score = state.coordination_scores.get(uid, 0.0)

            n_edges = sum(len(nb) for nb in state.edges.values())
            logger.info(
                "Graph pipeline: %d users, %d edges, converged in %d iterations",
                len(users),
                n_edges,
                state.iterations_converged,
            )
        except Exception:
            logger.exception("Graph sub-pipeline failed")

    # ── Signal 7 (D₅ location inconsistency) + Signal 9 (L_i refresh) ──

    def _run_spatial(self, session: Session) -> None:
        try:
            user_ids_with_locations = (
                session.query(UserLocation.user_id)
                .distinct()
                .all()
            )

            processed = 0
            for (uid,) in user_ids_with_locations:
                loc_rows = (
                    session.query(UserLocation)
                    .filter(UserLocation.user_id == uid)
                    .order_by(UserLocation.timestamp)
                    .all()
                )

                if not loc_rows:
                    continue

                records = [
                    LocationRecord(
                        lat=row.lat,
                        lon=row.lon,
                        timestamp=_ensure_utc(row.timestamp),
                        accuracy_meters=50.0,
                        source="gps",
                    )
                    for row in loc_rows
                ]

                confidence = compute_location_confidence(records)
                inconsistency = compute_location_inconsistency(records)

                user = session.get(User, uid)
                if user is not None:
                    user.location_confidence = confidence
                    if hasattr(user, "location_inconsistency"):
                        user.location_inconsistency = inconsistency
                    processed += 1

            logger.info("Spatial pipeline: %d users updated", processed)
        except Exception:
            logger.exception("Spatial sub-pipeline failed")

    # ── Signals 10-14 (extended input signals) ──

    def _run_extended_signals(self, session: Session) -> None:
        try:
            user_ids = [
                uid for (uid,) in session.query(User.user_id).all()
            ]

            computed = 0
            for uid in user_ids:
                uid_str = str(uid)

                meta_rows = (
                    session.query(UserRequestMetadata)
                    .filter(UserRequestMetadata.user_id == uid)
                    .order_by(UserRequestMetadata.timestamp)
                    .all()
                )

                device_ids = [r.device_id for r in meta_rows if r.device_id]
                ip_addresses = [r.ip_address for r in meta_rows if r.ip_address]
                timestamps = [_ensure_utc(r.timestamp).timestamp() for r in meta_rows]

                loc_rows = (
                    session.query(UserLocation)
                    .filter(UserLocation.user_id == uid)
                    .order_by(UserLocation.timestamp)
                    .all()
                )
                locations: list[tuple[float, float, float]] = [
                    (row.lat, row.lon, _ensure_utc(row.timestamp).timestamp())
                    for row in loc_rows
                ]

                signals = compute_all_extended_signals(
                    locations=locations or None,
                    device_ids=device_ids or None,
                    ip_addresses=ip_addresses or None,
                    ip_locations=None,
                    timestamps=timestamps or None,
                )

                self.user_signals[uid_str] = signals
                computed += 1

            logger.info(
                "Extended signals pipeline: %d users computed",
                computed,
            )
        except Exception:
            logger.exception("Extended signals sub-pipeline failed")

    # ── ML hooks (placeholder) ──

    def _run_ml_placeholder(self, session: Session) -> None:
        try:
            logger.info("ML pipeline: placeholder — plug in trained models here")
        except Exception:
            logger.exception("ML sub-pipeline failed")
