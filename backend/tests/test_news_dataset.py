"""Tests for ISOT news dataset loader."""

from __future__ import annotations

from pathlib import Path

import pytest

from simulation.news_dataset import (
    format_article_content,
    isot_dataset_available,
    load_isot_sample,
)
from simulation.simulator import Simulator

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "isot"


def test_isot_dataset_available_with_fixtures():
    assert isot_dataset_available(FIXTURE_DIR)


def test_format_article_content_truncation():
    long_text = "x" * 3000
    out = format_article_content("Title", long_text, max_len=100)
    assert len(out) == 100
    assert out.endswith("...")


def test_load_isot_sample_labels_and_count():
    articles = load_isot_sample(2, 3, seed=42, data_dir=FIXTURE_DIR)
    assert len(articles) == 5
    assert sum(1 for a in articles if a.is_true) == 2
    assert sum(1 for a in articles if not a.is_true) == 3
    assert all(a.content for a in articles)
    assert all("headline" in a.content.lower() for a in articles)


def test_load_isot_sample_reproducible():
    a = load_isot_sample(2, 2, seed=7, data_dir=FIXTURE_DIR)
    b = load_isot_sample(2, 2, seed=7, data_dir=FIXTURE_DIR)
    assert [x.content for x in a] == [x.content for x in b]


def test_load_isot_sample_too_many_raises():
    with pytest.raises(ValueError, match="only"):
        load_isot_sample(10, 0, seed=1, data_dir=FIXTURE_DIR)


def test_simulator_uses_isot_when_available():
    sim = Simulator(
        num_honest=5,
        num_noisy=0,
        num_adversarial=0,
        num_bots=0,
        num_true_posts=2,
        num_false_posts=2,
        use_real_news=True,
        news_data_dir=FIXTURE_DIR,
        seed=99,
    )
    assert sim.post_source == "isot"
    assert len(sim.posts) == 4
    assert any("headline" in p.content.lower() for p in sim.posts)


def test_simulator_falls_back_without_dataset(tmp_path):
    sim = Simulator(
        num_honest=5,
        num_noisy=0,
        num_adversarial=0,
        num_bots=0,
        num_true_posts=2,
        num_false_posts=2,
        use_real_news=True,
        news_data_dir=tmp_path,
        seed=99,
    )
    assert sim.post_source == "synthetic"
    assert len(sim.posts) == 4
