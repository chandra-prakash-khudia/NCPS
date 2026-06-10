"""
Stratified train/validation splits for simulation experiments.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from simulation.simulator import PostLabel, SimulatedPost, SimulatedUser, UserType


@dataclass(frozen=True)
class TrainValSplit:
    """Post and user ID sets for 70/30 (or custom) holdout evaluation."""

    train_post_ids: frozenset[str]
    val_post_ids: frozenset[str]
    train_user_ids: frozenset[str]
    val_user_ids: frozenset[str]


def _stratified_ids(
    groups: list[list[str]],
    train_ratio: float,
    rng: random.Random,
) -> tuple[set[str], set[str]]:
    train: set[str] = set()
    val: set[str] = set()
    for ids in groups:
        if not ids:
            continue
        shuffled = ids[:]
        rng.shuffle(shuffled)
        n_train = max(1, int(len(shuffled) * train_ratio)) if len(shuffled) > 1 else 1
        if n_train >= len(shuffled):
            n_train = len(shuffled) - 1 if len(shuffled) > 1 else len(shuffled)
        train.update(shuffled[:n_train])
        val.update(shuffled[n_train:])
    return train, val


def split_posts(
    posts: list[SimulatedPost],
    train_ratio: float = 0.7,
    seed: int = 42,
) -> tuple[set[str], set[str]]:
    """Stratified split by true vs fake post labels."""
    rng = random.Random(seed)
    true_ids = [str(p.post_id) for p in posts if p.label == PostLabel.TRUE]
    false_ids = [str(p.post_id) for p in posts if p.label == PostLabel.FALSE]
    return _stratified_ids([true_ids, false_ids], train_ratio, rng)


def split_users(
    users: list[SimulatedUser],
    train_ratio: float = 0.7,
    seed: int = 42,
) -> tuple[set[str], set[str]]:
    """Stratified split by honest vs adversarial/bot users."""
    rng = random.Random(seed + 1)
    honest_ids = [
        str(u.user_id)
        for u in users
        if u.user_type not in (UserType.ADVERSARIAL, UserType.BOT)
    ]
    anom_ids = [
        str(u.user_id)
        for u in users
        if u.user_type in (UserType.ADVERSARIAL, UserType.BOT)
    ]
    return _stratified_ids([honest_ids, anom_ids], train_ratio, rng)


def make_train_val_split(
    posts: list[SimulatedPost],
    users: list[SimulatedUser],
    train_ratio: float = 0.7,
    seed: int = 42,
) -> TrainValSplit:
    train_posts, val_posts = split_posts(posts, train_ratio, seed)
    train_users, val_users = split_users(users, train_ratio, seed)
    return TrainValSplit(
        train_post_ids=frozenset(train_posts),
        val_post_ids=frozenset(val_posts),
        train_user_ids=frozenset(train_users),
        val_user_ids=frozenset(val_users),
    )
