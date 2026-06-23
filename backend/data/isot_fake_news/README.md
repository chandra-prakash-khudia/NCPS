# ISOT Fake News Dataset (simulation)

The NCPS simulator can use real news articles instead of synthetic word posts.

**Source:** [Kaggle — Fake News Detection Datasets](https://www.kaggle.com/datasets/emineyetm/fake-news-detection-datasets) (ISOT: `True.csv` + `Fake.csv`)

## Setup

Place these files in this directory:

```
backend/data/isot_fake_news/True.csv
backend/data/isot_fake_news/Fake.csv
```

### Option A — download script

```bash
cd backend
pip install kaggle   # if not installed
# Configure ~/.kaggle/kaggle.json with your Kaggle API token
python scripts/download_isot_dataset.py
```

### Option B — manual

1. Download the dataset from Kaggle (requires a free account).
2. Copy `True.csv` and `Fake.csv` into this folder.

## Usage

By default each simulation samples **55 posts** (30 true + 25 fake) using `seed=42`.

```bash
cd backend
python -m simulation.runner
```

If the CSV files are missing, the simulator falls back to synthetic posts and prints a warning.
