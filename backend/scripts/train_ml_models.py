#!/usr/bin/env python3
"""
Train C_ML and Anom_ML on ISOT simulation data (70% train split, 2000 users default).

Artifacts: backend/models/trained/c_ml.joblib, anom_ml.joblib, metadata.json

Usage (from backend/):
  PYTHONPATH=. python scripts/train_ml_models.py
  PYTHONPATH=. python scripts/train_ml_models.py --users 500 --fast
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

from simulation.ml_training import train_and_save_models
from simulation.news_dataset import _count_csv_rows, default_data_dir

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = BACKEND_ROOT / "models" / "trained"


def main() -> int:
    parser = argparse.ArgumentParser(description="Train and save C_ML + Anom_ML for webapp")
    parser.add_argument("--users", type=int, default=2000, help="Total simulated users")
    parser.add_argument("--train-ratio", type=float, default=0.7, help="Train split fraction")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUT)
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Small ISOT subset + fewer votes (smoke test only)",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    d = default_data_dir()
    if args.fast:
        posts = dict(num_true_posts=30, num_false_posts=25)
        vote_cfg = dict(time_steps=100, interactions_per_step=10)
        print("FAST mode: 55 posts, 1k votes — not for production deployment")
    else:
        nt = _count_csv_rows(d / "True.csv")
        nf = _count_csv_rows(d / "Fake.csv")
        posts = dict(num_true_posts=nt, num_false_posts=nf)
        vote_cfg = dict(time_steps=4490, interactions_per_step=100)
        print(f"Full ISOT: {nt + nf} posts, 449,000 votes, {args.users} users")

    t0 = time.perf_counter()
    meta = train_and_save_models(
        args.output,
        num_users=args.users,
        train_val_ratio=args.train_ratio,
        seed=args.seed,
        news_data_dir=str(d),
        **posts,
        **vote_cfg,
    )
    elapsed = time.perf_counter() - t0

    print(f"\nDone in {elapsed / 60:.1f} min")
    print(f"  C_ML trained: {meta['c_ml_trained']} ({meta['c_ml_samples']} posts)")
    print(f"  Anom_ML trained: {meta['anom_ml_trained']} ({meta['anom_ml_samples']} users)")
    print(f"  Output: {args.output.resolve()}")
    print("\nRestart the webapp to load models (NCPS_LOCAL_ML_ENABLED=true by default).")
    return 0 if meta["c_ml_trained"] and meta["anom_ml_trained"] else 1


if __name__ == "__main__":
    sys.exit(main())
