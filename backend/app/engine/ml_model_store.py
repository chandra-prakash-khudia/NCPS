"""
Singleton loader for trained sklearn C_ML and Anom_ML models (webapp deployment).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import config as ncps_config
from app.engine.ml_engine import (
    AnomalyMLModel,
    CredibilityMLModel,
    UserBehaviorFeatures,
    extract_post_features,
    extract_user_behavior_features,
)
from app.engine.signal_engine import ExtendedSignals
from app.models.interaction import Interaction
from app.models.user import User

logger = logging.getLogger(__name__)

C_ML_FILENAME = "c_ml.joblib"
ANOM_ML_FILENAME = "anom_ml.joblib"

_c_ml: CredibilityMLModel | None = None
_anom_ml: AnomalyMLModel | None = None
_models_dir: Path | None = None


def get_models_dir() -> Path:
    return Path(ncps_config.ml_models_dir)


def get_c_ml_model() -> CredibilityMLModel | None:
    return _c_ml


def get_anom_model() -> AnomalyMLModel | None:
    return _anom_ml


def models_loaded() -> bool:
    return (_c_ml is not None and _c_ml.is_trained) or (
        _anom_ml is not None and _anom_ml.is_trained
    )


def load_trained_models(models_dir: str | Path | None = None) -> bool:
    """Load joblib artifacts from disk. Returns True if at least one model loaded."""
    global _c_ml, _anom_ml, _models_dir

    if not ncps_config.local_ml_enabled:
        logger.info("Local ML disabled (NCPS_LOCAL_ML_ENABLED=false)")
        return False

    _models_dir = Path(models_dir) if models_dir else get_models_dir()
    c_path = _models_dir / C_ML_FILENAME
    a_path = _models_dir / ANOM_ML_FILENAME

    loaded_any = False
    if c_path.is_file():
        try:
            _c_ml = CredibilityMLModel.load(c_path)
            loaded_any = True
            logger.info("Loaded C_ML from %s", c_path)
        except Exception:
            logger.exception("Failed to load C_ML from %s", c_path)
            _c_ml = None
    else:
        _c_ml = None
        logger.warning("C_ML not found at %s — run scripts/train_ml_models.py", c_path)

    if a_path.is_file():
        try:
            _anom_ml = AnomalyMLModel.load(a_path)
            loaded_any = True
            logger.info("Loaded Anom_ML from %s", a_path)
        except Exception:
            logger.exception("Failed to load Anom_ML from %s", a_path)
            _anom_ml = None
    else:
        _anom_ml = None
        logger.warning("Anom_ML not found at %s — run scripts/train_ml_models.py", a_path)

    return loaded_any


def predict_c_ml_local(
    content: str,
    *,
    early_votes: list[int] | None = None,
    interaction_count: int = 0,
    time_span_seconds: float = 1.0,
) -> float | None:
    if _c_ml is None or not _c_ml.is_trained:
        return None
    feats = extract_post_features(
        content=content,
        early_votes=early_votes,
        interaction_count=interaction_count,
        time_span_seconds=max(time_span_seconds, 1.0),
    )
    return _c_ml.predict(feats)


def build_webapp_user_features(
    session: Session,
    user: User,
    extended: ExtendedSignals | None = None,
) -> UserBehaviorFeatures:
    """Build 11-feature vector for Anom_ML from DB user state + pipeline signals."""
    uid = user.user_id
    interactions = list(
        session.scalars(select(Interaction).where(Interaction.user_id == uid)).all()
    )
    votes = [ix.vote for ix in interactions]
    action_counts: dict[str, int] = {"vote_up": 0, "vote_down": 0}
    for ix in interactions:
        if ix.vote > 0:
            action_counts["vote_up"] += 1
        else:
            action_counts["vote_down"] += 1

    if interactions:
        ts_values = [
            ix.timestamp.replace(tzinfo=timezone.utc)
            if ix.timestamp.tzinfo is None
            else ix.timestamp
            for ix in interactions
        ]
        span = max((max(ts_values) - min(ts_values)).total_seconds(), 60.0)
    else:
        span = 3600.0

    r_star = user.r_star if user.r_star is not None else 0.5
    consensus_dev = 1.0 - r_star
    coord = getattr(user, "coordination_score", None) or 0.0
    loc_inc = getattr(user, "location_inconsistency", None) or 0.0

    nav = extended.navigation_deviation if extended else 0.0
    device = extended.device_consistency if extended else 1.0
    ip = extended.ip_consistency if extended else 1.0
    session_c = extended.session_continuity if extended else 1.0
    timing = extended.timing_irregularity if extended else 1.0

    return extract_user_behavior_features(
        interactions_count=len(interactions),
        total_time_seconds=span,
        action_counts=action_counts,
        consensus_deviation=consensus_dev,
        coordination_score=coord,
        location_inconsistency=loc_inc,
        votes=votes,
        navigation_deviation=nav,
        device_consistency=device,
        ip_consistency=ip,
        session_continuity=session_c,
        timing_irregularity=timing,
    )


def predict_anom_ml_local(
    session: Session,
    user: User,
    extended: ExtendedSignals | None = None,
) -> float | None:
    if _anom_ml is None or not _anom_ml.is_trained:
        return None
    feats = build_webapp_user_features(session, user, extended)
    return _anom_ml.predict(feats)
