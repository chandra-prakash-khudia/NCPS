"""Tests for stratified train/validation splits."""

from __future__ import annotations

import uuid

from simulation.simulator import PostLabel, SimulatedPost, SimulatedUser, UserType
from simulation.splits import make_train_val_split, split_posts, split_users


def _posts(n_true: int, n_false: int) -> list[SimulatedPost]:
    posts = []
    for _ in range(n_true):
        posts.append(SimulatedPost(label=PostLabel.TRUE))
    for _ in range(n_false):
        posts.append(SimulatedPost(label=PostLabel.FALSE))
    return posts


def _users(n_honest: int, n_anom: int) -> list[SimulatedUser]:
    users = [SimulatedUser(user_type=UserType.HONEST) for _ in range(n_honest)]
    users += [SimulatedUser(user_type=UserType.BOT) for _ in range(n_anom)]
    return users


def test_split_posts_stratified_and_disjoint():
    posts = _posts(20, 20)
    train, val = split_posts(posts, train_ratio=0.7, seed=42)
    assert train.isdisjoint(val)
    assert len(train) + len(val) == 40
    assert 26 <= len(train) <= 30  # ~70% of 40 total (14 per class)


def test_split_users_stratified():
    users = _users(30, 10)
    train, val = split_users(users, train_ratio=0.7, seed=42)
    assert train.isdisjoint(val)
    assert len(train) + len(val) == 40


def test_make_train_val_split_reproducible():
    posts = _posts(10, 10)
    users = _users(14, 6)
    a = make_train_val_split(posts, users, seed=7)
    b = make_train_val_split(posts, users, seed=7)
    assert a == b


def test_split_preserves_label_balance():
    posts = _posts(100, 100)
    train, val = split_posts(posts, train_ratio=0.7, seed=99)
    post_map = {str(p.post_id): p for p in posts}
    train_true = sum(1 for pid in train if post_map[pid].label == PostLabel.TRUE)
    val_true = sum(1 for pid in val if post_map[pid].label == PostLabel.TRUE)
    assert train_true > 0 and val_true > 0
    assert (len(train) - train_true) > 0 and (len(val) - val_true) > 0
