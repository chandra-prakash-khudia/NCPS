"""Tests for ML model save/load and webapp inference helpers."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.engine.ml_engine import (
    AnomalyMLModel,
    CredibilityMLModel,
    PostFeatures,
    UserBehaviorFeatures,
)
from app.engine.ml_model_store import (
    ANOM_ML_FILENAME,
    C_ML_FILENAME,
    load_trained_models,
    predict_c_ml_local,
)


def _sample_post_features() -> PostFeatures:
    return PostFeatures(
        keyword_score=0.1,
        word_count=50,
        urgent_word_ratio=0.02,
        early_vote_ratio=0.5,
        interaction_velocity=0.01,
    )


def _sample_user_features() -> UserBehaviorFeatures:
    return UserBehaviorFeatures(
        activity_rate=1.0,
        vote_entropy=0.5,
        consensus_deviation=0.2,
        coordination_score=0.1,
        location_inconsistency=0.0,
        avg_vote_value=0.5,
        navigation_deviation=0.0,
        device_consistency=1.0,
        ip_consistency=1.0,
        session_continuity=1.0,
        timing_irregularity=1.0,
    )


def test_c_ml_save_load_roundtrip(tmp_path: Path) -> None:
    model = CredibilityMLModel()
    feats = [_sample_post_features() for _ in range(12)]
    labels = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
    model.train(feats, labels)
    path = tmp_path / C_ML_FILENAME
    model.save(path)

    loaded = CredibilityMLModel.load(path)
    assert loaded.is_trained
    pred = loaded.predict(_sample_post_features())
    assert 0.0 <= pred <= 1.0


def test_anom_ml_save_load_roundtrip(tmp_path: Path) -> None:
    model = AnomalyMLModel()
    feats = [_sample_user_features() for _ in range(12)]
    labels = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]
    model.train(feats, labels)
    path = tmp_path / ANOM_ML_FILENAME
    model.save(path)

    loaded = AnomalyMLModel.load(path)
    assert loaded.is_trained
    pred = loaded.predict(_sample_user_features())
    assert 0.0 <= pred <= 1.0


def test_load_and_predict_c_ml_local(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    import app.engine.ml_model_store as store
    import app.config as config_mod

    model = CredibilityMLModel()
    feats = [_sample_post_features() for _ in range(12)]
    labels = [1, 0] * 6
    model.train(feats, labels)
    model.save(tmp_path / C_ML_FILENAME)

    monkeypatch.setattr(config_mod.config, "local_ml_enabled", True)
    monkeypatch.setattr(config_mod.config, "ml_models_dir", str(tmp_path))
    store._c_ml = None
    store._anom_ml = None

    assert load_trained_models(tmp_path)
    score = predict_c_ml_local("fire emergency downtown accident")
    assert score is not None
    assert 0.0 <= score <= 1.0
