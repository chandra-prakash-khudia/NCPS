#!/usr/bin/env python3
"""
Run Phase 1→6 matrix at 70 / 500 / 2000 users on full ISOT with 70/30 train-val split.

Metrics reported on validation holdout only (30% posts / users).
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from simulation.news_dataset import _count_csv_rows, default_data_dir
from simulation.runner import ExperimentConfig, run_experiment

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "isot_fake_news"
OUTPUT_TXT = OUTPUT_DIR / "phase_user_matrix_val30_results.txt"
OUTPUT_JSON = OUTPUT_DIR / "phase_user_matrix_val30_results.json"


def attack_mix(total: int) -> dict:
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


PHASES = [
    ("P1", "Phase 1", False, False, False, False),
    ("P3", "Phase 3", True, False, False, False),
    ("P4", "Phase 4", True, True, False, False),
    ("P5", "Phase 5", True, True, True, False),
    ("P6", "Phase 6", True, True, True, True),
]

USER_SCALES = [70, 500, 2000]


def main() -> None:
    d = default_data_dir()
    nt = _count_csv_rows(d / "True.csv")
    nf = _count_csv_rows(d / "Fake.csv")
    posts = dict(num_true_posts=nt, num_false_posts=nf)
    vote_cfg = dict(time_steps=4490, interactions_per_step=100)

    print("NCPS Phase × User-Scale Matrix (70/30 val split)")
    print(f"Posts: {nt + nf} | Votes/run: 449,000 | seed=42")
    print(f"Started: {datetime.now(timezone.utc).isoformat()}\n")

    all_results: dict = {}
    t_all = time.perf_counter()

    for n_users in USER_SCALES:
        label = f"{n_users} users"
        mix = attack_mix(n_users)
        scale_results = {}
        print("=" * 80)
        print(f"{label} — {mix}")

        for key, pname, graph, spatial, ml, signals in PHASES:
            t0 = time.perf_counter()
            m = run_experiment(
                ExperimentConfig(
                    name=f"{pname} ({label})",
                    **mix,
                    **posts,
                    **vote_cfg,
                    use_graph=graph,
                    use_spatial=spatial,
                    use_ml=ml,
                    use_signals=signals,
                    train_val_ratio=0.7,
                    eval_on_val_only=True,
                )
            )
            elapsed = time.perf_counter() - t0
            scale_results[key] = {
                "accuracy": m.accuracy,
                "attack_success_rate": m.attack_success_rate,
                "brier_score": m.brier_score,
                "weight_correlation": m.weight_correlation,
                "anomaly_precision": m.anomaly_precision,
                "anomaly_recall": m.anomaly_recall,
                "elapsed_s": round(elapsed, 1),
            }
            print(f"  >> {key} done in {elapsed / 60:.1f} min")

        all_results[label] = scale_results

        phases = [scale_results[k] for k, *_ in PHASES]
        labels = [p[1] for p in PHASES]
        print(f"\n{label} — validation metrics")
        print(f"  {'Metric':<22} " + "".join(f"{l:>10}" for l in labels))
        print(f"  {'-' * 72}")
        for mname, field in [
            ("Accuracy", "accuracy"),
            ("Attack Success ↓", "attack_success_rate"),
            ("Brier Score ↓", "brier_score"),
            ("Weight Correlation", "weight_correlation"),
            ("Anomaly Precision", "anomaly_precision"),
            ("Anomaly Recall", "anomaly_recall"),
        ]:
            vals = "".join(f"{p[field]:>10.3f}" for p in phases)
            print(f"  {mname:<22} {vals}")
        print()

    total_min = (time.perf_counter() - t_all) / 60
    summary_lines = [
        "NCPS Phase × User-Scale Matrix (70/30 validation holdout)",
        f"Finished: {datetime.now(timezone.utc).isoformat()}",
        f"Total runtime: {total_min:.1f} min",
        "",
    ]
    for n_users in USER_SCALES:
        label = f"{n_users} users"
        sr = all_results[label]
        summary_lines.append(label)
        for key, pname, *_ in PHASES:
            r = sr[key]
            summary_lines.append(
                f"  {pname}: Acc={r['accuracy']:.3f} Attack={r['attack_success_rate']:.3f} "
                f"Anom-R={r['anomaly_recall']:.3f} ({r['elapsed_s']}s)"
            )
        summary_lines.append("")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_TXT.write_text("\n".join(summary_lines), encoding="utf-8")
    OUTPUT_JSON.write_text(json.dumps(all_results, indent=2), encoding="utf-8")
    print(f"Saved: {OUTPUT_TXT}")
    print(f"Saved: {OUTPUT_JSON}")
    print(f"Total runtime: {total_min:.1f} min")


if __name__ == "__main__":
    main()
