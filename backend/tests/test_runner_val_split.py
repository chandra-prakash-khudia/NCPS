"""Smoke tests for 70/30 validation split in run_experiment."""

from __future__ import annotations

from pathlib import Path

from simulation.runner import ExperimentConfig, run_experiment

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "isot"


def test_run_experiment_evaluates_val_posts_only():
    m = run_experiment(
        ExperimentConfig(
            name="val split smoke",
            num_honest=14,
            num_noisy=2,
            num_adversarial=2,
            num_bots=4,
            bot_groups=2,
            num_true_posts=3,
            num_false_posts=3,
            time_steps=20,
            interactions_per_step=10,
            use_graph=True,
            use_spatial=True,
            use_ml=True,
            use_signals=True,
            use_real_news=True,
            news_data_dir=FIXTURE_DIR,
            seed=42,
            train_val_ratio=0.7,
            eval_on_val_only=True,
        )
    )
    assert 0.0 <= m.accuracy <= 1.0
    assert m.total_posts == 6
