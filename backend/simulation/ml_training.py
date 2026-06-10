"""
Train C_ML and Anom_ML from ISOT simulation data and persist to disk.

Used by scripts/train_ml_models.py for webapp deployment.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from app.engine.graph_engine import VoteRecord, run_graph_pipeline
from app.engine.ml_engine import AnomalyMLModel, CredibilityMLModel
from app.engine.signal_engine import compute_all_extended_signals
from app.engine.spatial import LocationRecord, compute_location_inconsistency
from app.engine.user_engine import InteractionRecord, compute_reliability
from simulation.runner import (
    ExperimentConfig,
    _post_feature,
    _user_behavior_features,
)
from simulation.simulator import PostLabel, Simulator, UserType
from simulation.splits import make_train_val_split

from app.engine.ml_model_store import ANOM_ML_FILENAME, C_ML_FILENAME

logger = logging.getLogger(__name__)


def attack_mix(total: int) -> dict:
    """Default 40/5/5/20 honest/noisy/adversarial/bot mix."""
    h = round(total * 40 / 70)
    n = round(total * 5 / 70)
    a = round(total * 5 / 70)
    b = total - h - n - a
    return dict(
        num_honest=h,
        num_noisy=n,
        num_adversarial=a,
        num_bots=b,
        bot_groups=max(4, round(b / 5)),
    )


def train_and_save_models(
    output_dir: Path,
    *,
    num_users: int = 2000,
    train_val_ratio: float = 0.7,
    seed: int = 42,
    num_true_posts: int | None = None,
    num_false_posts: int | None = None,
    time_steps: int = 4490,
    interactions_per_step: int = 100,
    news_data_dir: str | None = None,
) -> dict:
    """
    Run Phase 6 simulation, train C_ML (70% posts) and Anom_ML (70% users), save joblib files.

    Returns metadata dict written alongside models.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    mix = attack_mix(num_users)
    cfg = ExperimentConfig(
        name=f"train_ml_{num_users}u",
        **mix,
        num_true_posts=num_true_posts or 30,
        num_false_posts=num_false_posts or 25,
        time_steps=time_steps,
        interactions_per_step=interactions_per_step,
        seed=seed,
        use_real_news=True,
        news_data_dir=news_data_dir,
        use_graph=True,
        use_spatial=True,
        use_ml=True,
        use_signals=True,
        train_val_ratio=train_val_ratio,
        eval_on_val_only=True,
    )

    t0 = datetime.now(timezone.utc)
    logger.info(
        "Training ML models: %d users, %d true + %d false posts, seed=%d",
        num_users,
        cfg.num_true_posts,
        cfg.num_false_posts,
        seed,
    )

    sim = Simulator(
        num_honest=cfg.num_honest,
        num_noisy=cfg.num_noisy,
        num_adversarial=cfg.num_adversarial,
        num_bots=cfg.num_bots,
        bot_groups=cfg.bot_groups,
        num_true_posts=cfg.num_true_posts,
        num_false_posts=cfg.num_false_posts,
        seed=cfg.seed,
        use_real_news=cfg.use_real_news,
        news_data_dir=cfg.news_data_dir,
    )
    interactions = sim.generate_interactions(
        time_steps=cfg.time_steps,
        interactions_per_step=cfg.interactions_per_step,
    )

    split = make_train_val_split(
        sim.posts, sim.users, train_ratio=cfg.train_val_ratio, seed=cfg.seed,
    )

    t_now = datetime.now(timezone.utc)
    location_inconsistencies: dict[str, float] = {}
    location_histories: dict[str, list[LocationRecord]] = {}
    raw_histories = sim.generate_location_history(time_steps=cfg.time_steps)
    for uid, readings in raw_histories.items():
        location_histories[uid] = [
            LocationRecord(
                lat=r["lat"],
                lon=r["lon"],
                timestamp=r["timestamp"],
                accuracy_meters=r["accuracy"],
                source=r["source"],
            )
            for r in readings
        ]
    for user in sim.users:
        uid = str(user.user_id)
        hist = location_histories.get(uid, [])
        location_inconsistencies[uid] = compute_location_inconsistency(hist)

    user_interactions: dict[str, list[InteractionRecord]] = {}
    user_action_counts: dict[str, dict[str, int]] = {}
    user_votes: dict[str, list[int]] = {}
    for inter in interactions:
        uid = str(inter.user_id)
        if uid not in user_interactions:
            user_interactions[uid] = []
            user_action_counts[uid] = {"vote_up": 0, "vote_down": 0}
            user_votes[uid] = []
        user_interactions[uid].append(
            InteractionRecord(
                timestamp=inter.timestamp, is_correct=inter.is_correct, quality=1.0,
            )
        )
        user_votes[uid].append(inter.vote)
        if inter.vote == 1:
            user_action_counts[uid]["vote_up"] += 1
        else:
            user_action_counts[uid]["vote_down"] += 1

    r_star_scores: dict[str, float] = {}
    for user in sim.users:
        uid = str(user.user_id)
        _, _, _, _, r_star = compute_reliability(user_interactions.get(uid, []), t_now)
        r_star_scores[uid] = r_star

    vote_records = [
        VoteRecord(
            user_id=str(i.user_id),
            post_id=str(i.post_id),
            vote=i.vote,
            timestamp=i.timestamp,
        )
        for i in interactions
    ]
    graph_state = run_graph_pipeline(vote_records, r_star_scores)
    coord_scores = graph_state.coordination_scores

    extended_signals: dict[str, dict] = {}
    user_metadata = sim.generate_user_metadata(interactions)
    loc_tuples: dict[str, list[tuple]] = {}
    for uid, hist in location_histories.items():
        loc_tuples[uid] = [(r.lat, r.lon, r.timestamp.timestamp()) for r in hist]

    for user in sim.users:
        uid = str(user.user_id)
        meta = user_metadata.get(uid, {})
        locs = loc_tuples.get(uid, [])
        signals = compute_all_extended_signals(
            locations=locs if locs else None,
            device_ids=meta.get("device_ids"),
            ip_addresses=meta.get("ip_addresses"),
            ip_locations=meta.get("ip_locations"),
            timestamps=meta.get("timestamps"),
        )
        extended_signals[uid] = {
            "nav": signals.navigation_deviation,
            "device": signals.device_consistency,
            "ip": signals.ip_consistency,
            "session": signals.session_continuity,
            "timing": signals.timing_irregularity,
        }

    post_early_votes: dict[str, list[int]] = {}
    post_vote_counts: dict[str, int] = {}
    for inter in interactions:
        pid = str(inter.post_id)
        post_vote_counts[pid] = post_vote_counts.get(pid, 0) + 1
        if post_vote_counts[pid] <= 3:
            post_early_votes.setdefault(pid, []).append(inter.vote)

    train_post_ids = set(split.train_post_ids)
    train_user_ids = set(split.train_user_ids)

    cred_model = CredibilityMLModel()
    train_features, train_labels = [], []
    for post in sim.posts:
        pid = str(post.post_id)
        if post.label == PostLabel.AMBIGUOUS or pid not in train_post_ids:
            continue
        train_features.append(
            _post_feature(post, post_early_votes, post_vote_counts, cfg.time_steps)
        )
        train_labels.append(1 if post.label == PostLabel.TRUE else 0)
    cred_model.train(train_features, train_labels)

    anom_model = AnomalyMLModel()
    train_user_feats, train_user_labels = [], []
    for user in sim.users:
        uid = str(user.user_id)
        if uid not in train_user_ids:
            continue
        feats = _user_behavior_features(
            user,
            cfg,
            user_interactions,
            user_action_counts,
            user_votes,
            r_star_scores,
            coord_scores,
            location_inconsistencies,
            extended_signals,
        )
        train_user_feats.append(feats)
        train_user_labels.append(
            1 if user.user_type in (UserType.ADVERSARIAL, UserType.BOT) else 0
        )
    anom_model.train(train_user_feats, train_user_labels)

    c_path = output_dir / C_ML_FILENAME
    a_path = output_dir / ANOM_ML_FILENAME
    if cred_model.is_trained:
        cred_model.save(c_path)
    if anom_model.is_trained:
        anom_model.save(a_path)

    metadata = {
        "trained_at": t0.isoformat(),
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "num_users": num_users,
        "user_mix": mix,
        "num_posts": len(sim.posts),
        "post_source": sim.post_source,
        "interactions": len(interactions),
        "train_val_ratio": train_val_ratio,
        "train_posts": len(split.train_post_ids),
        "train_users": len(split.train_user_ids),
        "c_ml_samples": len(train_labels),
        "anom_ml_samples": len(train_user_labels),
        "c_ml_trained": cred_model.is_trained,
        "anom_ml_trained": anom_model.is_trained,
        "seed": seed,
        "time_steps": time_steps,
        "interactions_per_step": interactions_per_step,
    }
    meta_path = output_dir / "metadata.json"
    meta_path.write_text(json.dumps(metadata, indent=2))

    logger.info("Saved models to %s (C_ML=%s, Anom_ML=%s)", output_dir, c_path, a_path)
    return metadata
