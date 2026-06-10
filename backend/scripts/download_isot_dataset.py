#!/usr/bin/env python3
"""
Download ISOT Fake News CSVs from Kaggle into backend/data/isot_fake_news/.

Requires: pip install kaggle
          ~/.kaggle/kaggle.json with your API token

Manual fallback: https://www.kaggle.com/datasets/emineyetm/fake-news-detection-datasets
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

DATASET = "emineyetm/fake-news-detection-datasets"
TARGET_DIR = Path(__file__).resolve().parent.parent / "data" / "isot_fake_news"
REQUIRED = ("True.csv", "Fake.csv")


def main() -> int:
    TARGET_DIR.mkdir(parents=True, exist_ok=True)

    if all((TARGET_DIR / name).is_file() for name in REQUIRED):
        print(f"Dataset already present in {TARGET_DIR}")
        return 0

    try:
        import kaggle  # noqa: F401
    except ImportError:
        print("Kaggle package not installed. Run: pip install kaggle")
        print(f"Or download manually and place {', '.join(REQUIRED)} in:")
        print(f"  {TARGET_DIR}")
        return 1

    print(f"Downloading {DATASET} ...")
    with tempfile.TemporaryDirectory() as tmp:
        cmd = [
            sys.executable, "-m", "kaggle", "datasets", "download",
            "-d", DATASET, "-p", tmp, "--unzip",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(result.stdout)
            print(result.stderr, file=sys.stderr)
            print("\nManual download:", f"https://www.kaggle.com/datasets/{DATASET}")
            return result.returncode

        for name in REQUIRED:
            src = Path(tmp) / name
            if not src.is_file():
                # Kaggle sometimes nests files in a subfolder
                matches = list(Path(tmp).rglob(name))
                src = matches[0] if matches else src
            if not src.is_file():
                print(f"Missing {name} in download. Check archive layout.")
                return 1
            shutil.copy2(src, TARGET_DIR / name)
            print(f"  → {TARGET_DIR / name}")

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
