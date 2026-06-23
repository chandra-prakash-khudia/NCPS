#!/usr/bin/env python3
"""Compare Phase 6 results at 70, 500, and 2000 users on full ISOT dataset."""

from __future__ import annotations

import time
from datetime import datetime, timezone

from simulation.news_dataset import _count_csv_rows, default_data_dir
from simulation.runner import ExperimentConfig, run_experiment


def attack_mix(total: int) -> dict:
    """Scale default 70-user attack proportions (40/5/5/20)."""
    h = round(total * 40 / 70)
    n = round(total * 5 / 70)
    a = round(total * 5 / 70)
    b = total - h - n - a
    groups = max(4, round(b / 5))
    return dict(
        num_honest=h,
        num_noisy=n,
        num_adversarial=a,
        num_bots=b,
        bot_groups=groups,
    )


def main() -> None:
    d = default_data_dir()
    nt = _count_csv_rows(d / "True.csv")
    nf = _count_csv_rows(d / "Fake.csv")
    total_posts = nt + nf
    vote_cfg = dict(time_steps=4490, interactions_per_step=100)
    posts = dict(num_true_posts=nt, num_false_posts=nf)

    configs = [
        ("70 users", attack_mix(70)),
        ("500 users", attack_mix(500)),
        ("2000 users", attack_mix(2000)),
    ]

    print("ISOT User-Scale Comparison — Phase 6 Full Pipeline")
    print(f"Posts: {total_posts} | Votes/run: 449,000 (~10/post)")
    print(f"Started: {datetime.now(timezone.utc).isoformat()}\n")

    rows = []
    for label, mix in configs:
        total_u = mix["num_honest"] + mix["num_noisy"] + mix["num_adversarial"] + mix["num_bots"]
        print("=" * 70)
        print(
            f"{label}: {mix['num_honest']} honest, {mix['num_noisy']} noisy, "
            f"{mix['num_adversarial']} adversarial, {mix['num_bots']} bots "
            f"({mix['bot_groups']} groups) = {total_u} total"
        )
        t0 = time.perf_counter()
        m = run_experiment(
            ExperimentConfig(
                name=f"Phase 6: {label}",
                **mix,
                **posts,
                **vote_cfg,
                use_graph=True,
                use_spatial=True,
                use_ml=True,
                use_signals=True,
            )
        )
        elapsed = time.perf_counter() - t0
        rows.append((label, total_u, mix, m, elapsed))
        print(f"  >> finished in {elapsed / 60:.1f} min\n")

    print("=" * 90)
    print("USER-SCALE COMPARISON — Phase 6 (Attack, Full ISOT, ~10 votes/post)")
    print("=" * 90)
    header = (
        f"{'Users':<12} {'Honest':>7} {'Noisy':>6} {'Adv':>5} {'Bots':>6} {'Groups':>7}  "
        f"{'Acc':>6} {'Attack':>7} {'Brier':>6} {'WCorr':>6} {'Anom-P':>7} {'Anom-R':>7} {'Time':>7}"
    )
    print(header)
    print("-" * 90)
    for label, _total_u, mix, m, elapsed in rows:
        print(
            f"{label:<12} {mix['num_honest']:>7} {mix['num_noisy']:>6} "
            f"{mix['num_adversarial']:>5} {mix['num_bots']:>6} {mix['bot_groups']:>7}  "
            f"{m.accuracy:>6.3f} {m.attack_success_rate:>7.3f} {m.brier_score:>6.3f} "
            f"{m.weight_correlation:>6.3f} {m.anomaly_precision:>7.3f} {m.anomaly_recall:>7.3f} "
            f"{elapsed / 60:>6.1f}m"
        )
    print()
    print(f"Finished: {datetime.now(timezone.utc).isoformat()}")


if __name__ == "__main__":
    main()
