"""
ISOT Fake News dataset loader for simulation.

Dataset: https://www.kaggle.com/datasets/emineyetm/fake-news-detection-datasets
Files: True.csv, Fake.csv (columns: title, text, subject, date)
"""

from __future__ import annotations

import csv
import random
from dataclasses import dataclass
from pathlib import Path

DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "isot_fake_news"
MAX_CONTENT_LEN = 2000


@dataclass(frozen=True)
class NewsArticle:
    """A sampled news article with ground-truth label."""

    content: str
    is_true: bool
    title: str = ""
    subject: str = ""


def default_data_dir() -> Path:
    return DEFAULT_DATA_DIR


def isot_dataset_available(data_dir: Path | str | None = None) -> bool:
    """Return True when both True.csv and Fake.csv exist."""
    root = Path(data_dir) if data_dir else default_data_dir()
    return (root / "True.csv").is_file() and (root / "Fake.csv").is_file()


def format_article_content(title: str, text: str, max_len: int = MAX_CONTENT_LEN) -> str:
    """Build post body from headline + article text, truncated for ML/engine limits."""
    title = (title or "").strip()
    body = (text or "").strip()
    if title and body:
        content = f"{title}. {body}"
    else:
        content = title or body
    if len(content) > max_len:
        return content[: max_len - 3].rstrip() + "..."
    return content


def _count_csv_rows(path: Path) -> int:
    with path.open(newline="", encoding="utf-8", errors="replace") as f:
        return sum(1 for _ in csv.DictReader(f))


def _read_csv_at_indices(path: Path, indices: set[int]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    with path.open(newline="", encoding="utf-8", errors="replace") as f:
        for i, row in enumerate(csv.DictReader(f)):
            if i in indices:
                rows.append(row)
            if len(rows) == len(indices):
                break
    return rows


def _sample_from_csv(
    path: Path,
    count: int,
    is_true: bool,
    rng: random.Random,
) -> list[NewsArticle]:
    if count <= 0:
        return []

    total = _count_csv_rows(path)
    if total == 0:
        raise ValueError(f"No data rows in {path}")
    if count > total:
        raise ValueError(f"Requested {count} articles but {path.name} has only {total}")

    picked = set(rng.sample(range(total), count))
    articles: list[NewsArticle] = []
    for row in _read_csv_at_indices(path, picked):
        articles.append(
            NewsArticle(
                content=format_article_content(row.get("title", ""), row.get("text", "")),
                is_true=is_true,
                title=(row.get("title") or "").strip(),
                subject=(row.get("subject") or "").strip(),
            )
        )
    return articles


def load_isot_sample(
    num_true: int,
    num_false: int,
    seed: int | None = 42,
    data_dir: Path | str | None = None,
) -> list[NewsArticle]:
    """
    Randomly sample true/fake articles from the ISOT CSV files.

    Same seed → same article subset. Articles from both files are shuffled together.
    """
    root = Path(data_dir) if data_dir else default_data_dir()
    if not isot_dataset_available(root):
        raise FileNotFoundError(
            f"ISOT dataset not found in {root}. "
            "Place True.csv and Fake.csv there or run scripts/download_isot_dataset.py"
        )

    rng = random.Random(seed)
    articles = _sample_from_csv(root / "True.csv", num_true, True, rng)
    articles.extend(_sample_from_csv(root / "Fake.csv", num_false, False, rng))
    rng.shuffle(articles)
    return articles
