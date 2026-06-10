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
from app.engine.hf_credibility import predict_credibility
from app.engine.ml_engine import MemoryEngine, MemoryEntry
from app.engine.ml_model_store import predict_anom_ml_local, predict_c_ml_local
from app.engine.signal_engine import ExtendedSignals, compute_all_extended_signals
from app.engine.spatial import (
    LocationRecord,
    compute_location_confidence,
    compute_location_inconsistency,
)
from app.config import config as ncps_config
from app.models.interaction import Interaction, UserLocation
from app.models.post import Post
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
            self._run_anom_ml_scoring(session)
            self._run_cml_backfill(session)
            self._run_memory_engine(session)
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

    # ── Anom_ML (trained sklearn model) ──

    def _run_anom_ml_scoring(self, session: Session) -> None:
        if not ncps_config.local_ml_enabled:
            return
        try:
            users = session.query(User).all()
            scored = 0
            for user in users:
                ext = self.user_signals.get(str(user.user_id))
                anom = predict_anom_ml_local(session, user, ext)
                if anom is None:
                    continue
                user.anom_ml = anom
                scored += 1
            if scored:
                logger.info("Anom_ML pipeline: scored %d users", scored)
        except Exception:
            logger.exception("Anom_ML sub-pipeline failed")

    # ── C_ML backfill (local sklearn → HF RoBERTa fallback) ──

    def _run_cml_backfill(self, session: Session) -> None:
        """
        Backfill c_ml for posts missing scores at creation time.
        Local model first; HF API only when local unavailable and token set.
        """
        use_local = ncps_config.local_ml_enabled
        use_hf = ncps_config.hf_cml_enabled and bool(ncps_config.hf_api_token)
        if not use_local and not use_hf:
            return

        try:
            posts_to_score = (
                session.query(Post)
                .filter(Post.c_ml.is_(None))
                .order_by(Post.created_at)
                .limit(20)
                .all()
            )
            if not posts_to_score:
                return

            alpha_ml = ncps_config.credibility_alpha_ml
            scored = 0
            for post in posts_to_score:
                c_ml = predict_c_ml_local(post.content) if use_local else None
                if c_ml is None and use_hf:
                    c_ml = predict_credibility(post.content)
                if c_ml is None:
                    break
                post.c_ml = c_ml
                c_bayes = post.c_bayes if post.c_bayes is not None else 0.5
                post.c_final = (1.0 - alpha_ml) * c_bayes + alpha_ml * c_ml
                scored += 1

            if scored:
                logger.info("C_ML backfill: scored %d/%d posts", scored, len(posts_to_score))
        except Exception:
            logger.exception("C_ML backfill sub-pipeline failed")

    # ── C_memory via TF-IDF cosine similarity (MemoryEngine) ──

    def _run_memory_engine(self, session: Session) -> None:
        """
        Builds a TF-IDF memory bank from resolved posts (n_effective >= 3)
        and scores posts with NULL c_memory using cosine similarity.

        This mirrors exactly what the simulation does:
          C_memory(j) = Σ Sim(j,k) × C_k / Σ Sim(j,k)

        where Sim = TF-IDF cosine similarity between post j and past post k.

        Posts with settled credibility (n_effective >= 3) become the memory bank.
        New/unscored posts (c_memory IS NULL) are queried against this bank.
        """
        try:
            # ── Step 1: Build memory bank from resolved posts ──
            # Use posts with at least 3 effective votes as "resolved"
            resolved_posts = (
                session.query(Post)
                .filter(
                    Post.n_effective >= 3.0,
                    Post.c_final.isnot(None),
                    Post.content.isnot(None),
                )
                .order_by(Post.created_at)
                .all()
            )

            if len(resolved_posts) < 3:
                logger.debug(
                    "Memory engine skipped: only %d resolved posts (need >= 3)",
                    len(resolved_posts),
                )
                return

            memory_entries = [
                MemoryEntry(
                    post_id=str(p.post_id),
                    content=p.content,
                    credibility=p.c_final if p.c_final is not None else 0.5,
                )
                for p in resolved_posts
            ]

            engine = MemoryEngine()
            engine.build_memory(memory_entries)
            logger.info(
                "Memory engine: built TF-IDF index from %d resolved posts",
                len(memory_entries),
            )

            # ── Step 2: Score posts with c_memory IS NULL ──
            unscored_posts = (
                session.query(Post)
                .filter(Post.c_memory.is_(None), Post.content.isnot(None))
                .order_by(Post.created_at)
                .limit(50)  # cap per cycle
                .all()
            )

            if not unscored_posts:
                logger.debug("Memory engine: no posts to score")
                return

            alpha_ml = ncps_config.credibility_alpha_ml      # 0.15
            gamma_mem = ncps_config.credibility_gamma_memory  # 0.10
            base_weight = 1.0 - alpha_ml - gamma_mem          # 0.75

            scored = 0
            for post in unscored_posts:
                c_memory = engine.query(post.content)
                if c_memory is None:
                    continue  # no similarity found — skip, retry next cycle

                post.c_memory = c_memory

                # Recompute c_final = 0.75 * C_Bayes + 0.15 * C_ML + 0.10 * C_memory
                c_bayes = post.c_bayes if post.c_bayes is not None else 0.5
                c_ml = post.c_ml if post.c_ml is not None else c_bayes
                post.c_final = (
                    base_weight * c_bayes
                    + alpha_ml * c_ml
                    + gamma_mem * c_memory
                )
                scored += 1

            logger.info(
                "Memory engine: scored %d/%d posts with C_memory",
                scored,
                len(unscored_posts),
            )
        except Exception:
            logger.exception("Memory engine sub-pipeline failed")
