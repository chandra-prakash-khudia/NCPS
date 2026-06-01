"""
Database-backed store for the user-facing NCPS webapp.

The formulas here mirror the previous MemoryStore behavior so persistence does
not change the user-facing credibility behavior.
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.interaction import Alert, Interaction, UserLocation
from app.models.post import Post
from app.models.user import User
from webapp.models import (
    AuthAccount,
    Bookmark,
    ContentReport,
    ObservabilityEvent,
    UserPreference,
    WebPushSubscription,
)


class DuplicateVoteError(ValueError):
    """Raised when a user has already voted on a post."""


class DuplicateReportError(ValueError):
    """Raised when a user has already reported a post."""


VALID_CATEGORIES = {
    "politics",
    "sports",
    "health",
    "science",
    "technology",
    "business",
    "environment",
    "education",
    "traffic",
    "crime",
    "emergency",
    "civic",
    "weather",
    "other",
}


class WebappStore:
    """Persistent webapp storage and current webapp scoring behavior."""

    def __init__(self, session: Session):
        self.session = session

    # -- Accounts --

    def create_account(self, name: str, email: str, password_hash: str) -> AuthAccount:
        if self.get_account_by_email(email) is not None:
            raise ValueError("Email is already registered")

        user_id = uuid.uuid4()
        role = "admin" if self.count_accounts() == 0 else "member"
        user = self.create_user(user_id)
        account = AuthAccount(
            user_id=user.user_id,
            name=name,
            email=email,
            password_hash=password_hash,
            role=role,
        )
        self.session.add(account)
        self.session.flush()
        return account

    def create_or_update_google_account(self, google_profile: dict) -> AuthAccount:
        subject = str(google_profile["sub"])
        email = str(google_profile["email"]).strip().lower()
        name = " ".join(str(google_profile.get("name") or email.split("@")[0]).split())[:80]
        picture = google_profile.get("picture")

        account = self.get_account_by_google_subject(subject)
        if account is None:
            account = self.get_account_by_email(email)

        if account is None:
            user_id = uuid.uuid4()
            role = "admin" if self.count_accounts() == 0 else "member"
            user = self.create_user(user_id)
            account = AuthAccount(
                user_id=user.user_id,
                name=name or "Google User",
                email=email,
                password_hash=None,
                auth_provider="google",
                google_subject=subject,
                avatar_url=str(picture) if picture else None,
                role=role,
            )
            self.session.add(account)
        else:
            account.name = name or account.name
            account.email = email
            account.auth_provider = "google" if not account.password_hash else "password+google"
            account.google_subject = subject
            account.avatar_url = str(picture) if picture else account.avatar_url
            account.updated_at = datetime.now(timezone.utc)

        self.session.flush()
        return account

    def count_accounts(self) -> int:
        return self.session.scalar(select(func.count()).select_from(AuthAccount)) or 0

    def get_account_by_email(self, email: str) -> AuthAccount | None:
        return self.session.scalar(select(AuthAccount).where(AuthAccount.email == email))

    def get_account_by_google_subject(self, subject: str) -> AuthAccount | None:
        return self.session.scalar(select(AuthAccount).where(AuthAccount.google_subject == subject))

    def get_account_by_user_id(self, user_id: str | uuid.UUID) -> AuthAccount | None:
        parsed_user_id = _parse_uuid(user_id)
        return self.session.scalar(select(AuthAccount).where(AuthAccount.user_id == parsed_user_id))

    def touch_login(self, account: AuthAccount) -> None:
        account.last_login_at = datetime.now(timezone.utc)
        account.updated_at = datetime.now(timezone.utc)

    # -- Users --

    def create_user(self, user_id: uuid.UUID | None = None) -> User:
        user = User(
            user_id=user_id or uuid.uuid4(),
            r_star=0.5,
            exp_raw=0.0,
            exp_score=0.0,
            anomaly_score=0.0,
            trust_score=0.5,
            location_confidence=0.5,
            points=0,
            current_daily_streak=0,
            current_weekly_streak=0,
            best_daily_streak=0,
            best_weekly_streak=0,
        )
        self.session.add(user)
        self.session.flush()
        return user

    def get_user(self, user_id: str | uuid.UUID) -> User | None:
        parsed_user_id = _parse_uuid(user_id)
        return self.session.get(User, parsed_user_id)

    def get_or_create_user(self, user_id: str | uuid.UUID) -> User:
        user = self.get_user(user_id)
        if user is None:
            user = self.create_user(_parse_uuid(user_id))
        return user

    def get_or_create_preferences(self, user_id: str | uuid.UUID) -> UserPreference:
        parsed_user_id = _parse_uuid(user_id)
        preferences = self.session.get(UserPreference, parsed_user_id)
        if preferences is None:
            preferences = UserPreference(user_id=parsed_user_id)
            self.session.add(preferences)
            self.session.flush()
        return preferences

    def preferences_to_dict(self, preferences: UserPreference) -> dict:
        return {
            "followed_topics": preferences.followed_topics or [],
            "alerts_enabled": preferences.alerts_enabled,
            "breaking_only": preferences.breaking_only,
            "alert_radius_m": preferences.alert_radius_m,
            "feed_radius_m": preferences.feed_radius_m,
            "city": preferences.city,
            "updated_at": _iso(preferences.updated_at),
        }

    def update_preferences(
        self,
        user_id: str | uuid.UUID,
        *,
        followed_topics: list[str] | None = None,
        alerts_enabled: bool | None = None,
        breaking_only: bool | None = None,
        alert_radius_m: float | None = None,
        feed_radius_m: float | None = None,
        city: str | None = None,
    ) -> UserPreference:
        user = self.get_or_create_user(user_id)
        preferences = self.get_or_create_preferences(user.user_id)

        if followed_topics is not None:
            preferences.followed_topics = [
                self.normalize_category(topic)
                for topic in followed_topics
                if self.normalize_category(topic) != "other"
            ][:12]
        if alerts_enabled is not None:
            preferences.alerts_enabled = alerts_enabled
        if breaking_only is not None:
            preferences.breaking_only = breaking_only
        if alert_radius_m is not None:
            preferences.alert_radius_m = min(max(float(alert_radius_m), 250.0), 10000.0)
        if feed_radius_m is not None:
            preferences.feed_radius_m = min(max(float(feed_radius_m), 1000.0), 100000.0)
        if city is not None:
            preferences.city = _clean_text(city, 120) or None
            user.city = preferences.city

        preferences.updated_at = datetime.now(timezone.utc)
        self.session.flush()
        return preferences

    def update_location(
        self,
        user_id: str | uuid.UUID,
        lat: float,
        lon: float,
        city: str | None = None,
        country: str | None = None,
    ) -> User:
        user = self.get_or_create_user(user_id)
        user.lat = lat
        user.lon = lon
        if city is not None:
            user.city = _clean_text(city, 120) or None
            self.get_or_create_preferences(user.user_id).city = user.city
        if country is not None:
            user.country = _clean_text(country, 120) or None
        user.location_confidence = min(1.0, (user.location_confidence or 0.5) + 0.05)
        user.updated_at = datetime.now(timezone.utc)
        self.session.add(UserLocation(user_id=user.user_id, lat=lat, lon=lon))
        self._touch_activity(user, points=2)
        self.session.flush()
        return user

    # -- Posts --

    def create_post(
        self,
        user_id: str | uuid.UUID,
        content: str,
        lat: float | None,
        lon: float | None,
        category: str | None = None,
        image_url: str | None = None,
        source_url: str | None = None,
    ) -> Post:
        user = self.get_or_create_user(user_id)
        post = Post(
            user_id=user.user_id,
            content=content,
            category=self.normalize_category(category or self.infer_category(content)),
            image_url=image_url,
            source_url=source_url,
            c_bayes=0.5,
            c_final=0.5,
            variance=0.0,
            n_effective=0.0,
            s_plus=0.0,
            s_minus=0.0,
            urgency=self._compute_urgency(content),
            radius=1000.0,
            lat=lat,
            lon=lon,
        )
        self.session.add(post)

        user.exp_score = min(1.0, (user.exp_score or 0.0) + 0.02)
        user.exp_raw = user.exp_score
        user.updated_at = datetime.now(timezone.utc)
        self._touch_activity(user, points=10)
        self.session.flush()
        return post

    def get_post(self, post_id: str | uuid.UUID) -> Post | None:
        parsed_post_id = _parse_uuid(post_id)
        return self.session.get(Post, parsed_post_id)

    def get_feed(
        self,
        lat: float | None = None,
        lon: float | None = None,
        limit: int = 50,
        category: str | None = None,
        mode: str = "local",
        radius_m: float | None = None,
    ) -> list[Post]:
        query = select(Post)
        normalized_category = self.normalize_category(category) if category else None
        if normalized_category and normalized_category != "all":
            query = query.where(Post.category == normalized_category)

        posts = list(self.session.scalars(query).all())
        if mode == "local" and radius_m and lat is not None and lon is not None:
            posts = [
                post
                for post in posts
                if post.lat is None
                or post.lon is None
                or self.haversine(lat, lon, post.lat, post.lon) <= radius_m
            ]

        def score(post: Post) -> float:
            post_score = 0.5 * _score(post.c_final, 0.5) + 0.3 * _score(post.urgency, 0.0)
            if lat is not None and lon is not None and post.lat is not None and post.lon is not None:
                dist = self.haversine(lat, lon, post.lat, post.lon)
                post_score += 0.2 * math.exp(-dist / 5000)
            return post_score

        posts.sort(key=score, reverse=True)
        return posts[:limit]

    # -- Voting --

    def vote(self, user_id: str | uuid.UUID, post_id: str | uuid.UUID, vote: int) -> dict:
        user = self.get_or_create_user(user_id)
        post = self.get_post(post_id)
        if post is None:
            raise ValueError(f"Post {post_id} not found")
        if self.user_vote(user.user_id, post.post_id) is not None:
            raise DuplicateVoteError("You already voted on this post")

        interaction = Interaction(
            user_id=user.user_id,
            post_id=post.post_id,
            vote=vote,
            weight=self.user_weight(user),
        )
        self.session.add(interaction)
        try:
            self.session.flush()
        except IntegrityError as exc:
            raise DuplicateVoteError("You already voted on this post") from exc

        self._recompute_post(post)
        self._update_reliability(user)
        user.exp_score = min(1.0, (user.exp_score or 0.0) + 0.01)
        user.exp_raw = user.exp_score
        user.updated_at = datetime.now(timezone.utc)
        self._touch_activity(user, points=3)
        alerts = self.generate_alerts_for_post(post.post_id, source="vote")
        self.session.flush()

        return {
            "interaction_id": str(interaction.interaction_id),
            "post_id": str(post.post_id),
            "updated_credibility": post.c_final,
            "alerts": [self.alert_to_dict(alert) for alert in alerts],
        }

    def user_vote(self, user_id: str | uuid.UUID, post_id: str | uuid.UUID) -> int | None:
        interaction = self.session.scalar(
            select(Interaction).where(
                Interaction.user_id == _parse_uuid(user_id),
                Interaction.post_id == _parse_uuid(post_id),
            )
        )
        return interaction.vote if interaction else None

    def post_votes(self, post_id: str | uuid.UUID) -> dict[str, int]:
        rows = self.session.scalars(
            select(Interaction).where(Interaction.post_id == _parse_uuid(post_id))
        )
        return {str(item.user_id): item.vote for item in rows}

    # -- Profile and activity --

    def post_count(self, user_id: str | uuid.UUID) -> int:
        return self.session.scalar(
            select(func.count()).select_from(Post).where(Post.user_id == _parse_uuid(user_id))
        ) or 0

    def vote_count(self, user_id: str | uuid.UUID) -> int:
        return self.session.scalar(
            select(func.count()).select_from(Interaction).where(Interaction.user_id == _parse_uuid(user_id))
        ) or 0

    def recent_posts(self, user_id: str | uuid.UUID, limit: int = 8) -> list[Post]:
        return list(self.session.scalars(
            select(Post)
            .where(Post.user_id == _parse_uuid(user_id))
            .order_by(Post.created_at.desc())
            .limit(limit)
        ).all())

    def recent_votes(self, user_id: str | uuid.UUID, limit: int = 8) -> list[Interaction]:
        return list(self.session.scalars(
            select(Interaction)
            .where(Interaction.user_id == _parse_uuid(user_id))
            .order_by(Interaction.timestamp.desc())
            .limit(limit)
        ).all())

    # -- Serialization helpers --

    def account_public(self, account: AuthAccount) -> dict:
        return {
            "user_id": str(account.user_id),
            "name": account.name,
            "email": account.email,
            "role": account.role,
            "auth_provider": account.auth_provider,
            "avatar_url": account.avatar_url,
            "created_at": _iso(account.created_at),
            "last_login_at": _iso(account.last_login_at),
        }

    def user_state_to_dict(self, user: User, account: AuthAccount | None = None) -> dict:
        return {
            "user_id": str(user.user_id),
            "name": account.name if account else None,
            "email": account.email if account else None,
            "role": account.role if account else "member",
            "r_star": round(_score(user.r_star, 0.5), 3),
            "exp_score": round(_score(user.exp_score, 0.0), 3),
            "anomaly_score": round(_score(user.anomaly_score, 0.0), 3),
            "trust_score": round(_score(user.trust_score, 0.5), 3),
            "weight": round(self.user_weight(user), 3),
            "location_confidence": round(_score(user.location_confidence, 0.5), 3),
            "vote_count": self.vote_count(user.user_id),
            "post_count": self.post_count(user.user_id),
            "points": user.points or 0,
            "daily_streak": user.current_daily_streak or 0,
            "weekly_streak": user.current_weekly_streak or 0,
            "best_daily_streak": user.best_daily_streak or 0,
            "best_weekly_streak": user.best_weekly_streak or 0,
            "city": user.city,
            "country": user.country,
            "created_at": _iso(user.created_at),
        }

    def post_to_dict(
        self,
        post: Post,
        user_lat: float | None = None,
        user_lon: float | None = None,
        viewer_id: str | uuid.UUID | None = None,
    ) -> dict:
        viewer_uuid = _parse_uuid(viewer_id) if viewer_id else None
        distance = None
        if user_lat is not None and user_lon is not None and post.lat is not None and post.lon is not None:
            distance = round(self.haversine(user_lat, user_lon, post.lat, post.lon))

        votes = self.post_votes(post.post_id)
        account = self.get_account_by_user_id(post.user_id)
        credibility = _score(post.c_final, 0.5)
        urgency = _score(post.urgency, 0.0)
        n_effective = _score(post.n_effective, 0.0)
        variance = _score(post.variance, 0.0)
        is_bookmarked = bool(viewer_uuid and self.is_bookmarked(viewer_uuid, post.post_id))

        indicators = []
        if credibility >= 0.75 and n_effective >= 5:
            indicators.append("Community Verified")
        if urgency >= 0.6:
            indicators.append("Trending")
        if n_effective >= 8:
            indicators.append("Frequently Discussed")
        if credibility >= 0.6 and variance < 0.1:
            indicators.append("Recommended")
        if distance is not None and distance <= 1000:
            indicators.append("Hyperlocal")
        if post.is_global:
            indicators.append("Global")

        return {
            "post_id": str(post.post_id),
            "user_id": str(post.user_id)[:8],
            "author_user_id": str(post.user_id),
            "author_name": account.name if account else "Community member",
            "content": post.content,
            "image_url": post.image_url,
            "source_url": post.source_url,
            "category": post.category,
            "credibility": round(credibility, 3),
            "c_bayes": round(_score(post.c_bayes, 0.5), 3),
            "c_ml": round(_score(post.c_ml, 0.5), 3) if post.c_ml is not None else None,
            "c_memory": round(_score(post.c_memory, 0.5), 3) if post.c_memory is not None else None,
            "variance": round(variance, 3),
            "n_effective": round(n_effective, 1),
            "urgency": round(urgency, 2),
            "radius": round(_score(post.radius, 1000.0)),
            "is_global": post.is_global,
            "lat": post.lat,
            "lon": post.lon,
            "created_at": _iso(post.created_at),
            "vote_count": len(votes),
            "shares_count": post.shares_count,
            "bookmarks_count": post.bookmarks_count,
            "reports_count": post.reports_count,
            "is_bookmarked": is_bookmarked,
            "user_vote": votes.get(str(viewer_uuid)) if viewer_uuid else None,
            "can_vote": bool(viewer_uuid and str(viewer_uuid) not in votes),
            "is_own_post": bool(viewer_uuid and viewer_uuid == post.user_id),
            "distance_m": distance,
            "indicators": indicators,
            "why_shown": self.why_shown(post, distance),
        }

    def vote_activity_to_dict(self, interaction: Interaction) -> dict:
        post = self.get_post(interaction.post_id)
        return {
            "interaction_id": str(interaction.interaction_id),
            "post_id": str(interaction.post_id),
            "vote": interaction.vote,
            "timestamp": _iso(interaction.timestamp),
            "post_preview": post.content[:120] if post else "Post unavailable",
            "post_credibility": round(_score(post.c_final, 0.5), 3) if post else None,
        }

    # -- Social actions and moderation --

    def is_bookmarked(self, user_id: str | uuid.UUID, post_id: str | uuid.UUID) -> bool:
        return self.session.scalar(
            select(Bookmark).where(
                Bookmark.user_id == _parse_uuid(user_id),
                Bookmark.post_id == _parse_uuid(post_id),
            )
        ) is not None

    def bookmark_post(self, user_id: str | uuid.UUID, post_id: str | uuid.UUID) -> dict:
        user = self.get_or_create_user(user_id)
        post = self.get_post(post_id)
        if post is None:
            raise ValueError("Post not found")

        created = False
        if not self.is_bookmarked(user.user_id, post.post_id):
            self.session.add(Bookmark(user_id=user.user_id, post_id=post.post_id))
            post.bookmarks_count = max(0, (post.bookmarks_count or 0) + 1)
            self._touch_activity(user, points=1)
            created = True
        self.session.flush()
        return {"bookmarked": True, "created": created, "bookmarks_count": post.bookmarks_count}

    def unbookmark_post(self, user_id: str | uuid.UUID, post_id: str | uuid.UUID) -> dict:
        post = self.get_post(post_id)
        if post is None:
            raise ValueError("Post not found")
        bookmark = self.session.scalar(
            select(Bookmark).where(
                Bookmark.user_id == _parse_uuid(user_id),
                Bookmark.post_id == post.post_id,
            )
        )
        if bookmark is not None:
            self.session.delete(bookmark)
            post.bookmarks_count = max(0, (post.bookmarks_count or 0) - 1)
        self.session.flush()
        return {"bookmarked": False, "bookmarks_count": post.bookmarks_count}

    def share_post(self, user_id: str | uuid.UUID, post_id: str | uuid.UUID) -> dict:
        user = self.get_or_create_user(user_id)
        post = self.get_post(post_id)
        if post is None:
            raise ValueError("Post not found")
        post.shares_count = (post.shares_count or 0) + 1
        self._touch_activity(user, points=1)
        self.session.flush()
        return {"shares_count": post.shares_count}

    def report_post(
        self,
        reporter_id: str | uuid.UUID,
        post_id: str | uuid.UUID,
        reason: str,
        description: str | None = None,
    ) -> dict:
        reporter = self.get_or_create_user(reporter_id)
        post = self.get_post(post_id)
        if post is None:
            raise ValueError("Post not found")
        if post.user_id == reporter.user_id:
            raise ValueError("You cannot report your own post")

        existing = self.session.scalar(
            select(ContentReport).where(
                ContentReport.reporter_id == reporter.user_id,
                ContentReport.post_id == post.post_id,
                ContentReport.status == "pending",
            )
        )
        if existing is not None:
            raise DuplicateReportError("You already reported this post")

        report = ContentReport(
            reporter_id=reporter.user_id,
            post_id=post.post_id,
            reason=_clean_text(reason, 64) or "other",
            description=_clean_text(description, 2000) if description else None,
        )
        self.session.add(report)
        post.reports_count = (post.reports_count or 0) + 1
        self._touch_activity(reporter, points=1)
        self.session.flush()
        return {
            "report_id": str(report.report_id),
            "reports_count": post.reports_count,
            "status": report.status,
        }

    def saved_posts(self, user_id: str | uuid.UUID, limit: int = 20) -> list[Post]:
        rows = self.session.scalars(
            select(Bookmark)
            .where(Bookmark.user_id == _parse_uuid(user_id))
            .order_by(Bookmark.created_at.desc())
            .limit(max(1, min(limit, 100)))
        ).all()
        posts = [self.get_post(row.post_id) for row in rows]
        return [post for post in posts if post is not None]

    # -- Alerts and notifications --

    def generate_alerts_for_post(self, post_id: str | uuid.UUID, source: str = "post") -> list[Alert]:
        post = self.get_post(post_id)
        if post is None or post.lat is None or post.lon is None:
            return []

        credibility = _score(post.c_final, 0.5)
        urgency = _score(post.urgency, 0.0)
        if not (urgency >= 0.4 or credibility * urgency >= 0.25):
            return []

        created: list[Alert] = []
        users = list(self.session.scalars(select(User)).all())
        for user in users:
            if user.user_id == post.user_id or user.lat is None or user.lon is None:
                continue
            preferences = self.get_or_create_preferences(user.user_id)
            if not preferences.alerts_enabled:
                continue
            if preferences.followed_topics and post.category not in preferences.followed_topics:
                continue

            distance = self.haversine(user.lat, user.lon, post.lat, post.lon)
            radius = min(_score(preferences.alert_radius_m, 1000.0), 10000.0)
            if distance > radius:
                continue

            existing = self.session.scalar(
                select(Alert).where(
                    Alert.user_id == user.user_id,
                    Alert.post_id == post.post_id,
                    Alert.alert_type == "hyperlocal",
                )
            )
            if existing is not None:
                continue

            proximity = _score(user.location_confidence, 0.5) * math.exp(-(distance ** 2) / (2 * (1000.0 ** 2)))
            title = "Hyperlocal alert"
            if distance <= 1000:
                title = "Within 1 km"
            alert = Alert(
                user_id=user.user_id,
                post_id=post.post_id,
                delivered=True,
                alert_type="hyperlocal",
                title=title,
                message=_clean_text(post.content, 140) or "A nearby report needs attention.",
                category=post.category,
                distance_m=distance,
                proximity=proximity,
                metadata_json={
                    "source": source,
                    "credibility": round(credibility, 3),
                    "urgency": round(urgency, 3),
                    "radius_m": radius,
                },
            )
            self.session.add(alert)
            created.append(alert)

        self.session.flush()
        return created

    def list_alerts(self, user_id: str | uuid.UUID, unread_only: bool = False, limit: int = 50) -> list[Alert]:
        query = select(Alert).where(Alert.user_id == _parse_uuid(user_id))
        if unread_only:
            query = query.where(Alert.is_read.is_(False))
        return list(
            self.session.scalars(
                query.order_by(Alert.timestamp.desc()).limit(max(1, min(limit, 100)))
            ).all()
        )

    def unread_alert_count(self, user_id: str | uuid.UUID) -> int:
        return self.session.scalar(
            select(func.count())
            .select_from(Alert)
            .where(Alert.user_id == _parse_uuid(user_id), Alert.is_read.is_(False))
        ) or 0

    def mark_alert_read(self, user_id: str | uuid.UUID, alert_id: str | uuid.UUID) -> Alert:
        alert = self.session.get(Alert, _parse_uuid(alert_id))
        if alert is None or alert.user_id != _parse_uuid(user_id):
            raise ValueError("Alert not found")
        alert.is_read = True
        alert.read_at = datetime.now(timezone.utc)
        self.session.flush()
        return alert

    def mark_all_alerts_read(self, user_id: str | uuid.UUID) -> int:
        alerts = self.list_alerts(user_id, unread_only=True, limit=100)
        now = datetime.now(timezone.utc)
        for alert in alerts:
            alert.is_read = True
            alert.read_at = now
        self.session.flush()
        return len(alerts)

    def alert_to_dict(self, alert: Alert) -> dict:
        post = self.get_post(alert.post_id)
        return {
            "alert_id": str(alert.alert_id),
            "user_id": str(alert.user_id),
            "post_id": str(alert.post_id),
            "type": alert.alert_type,
            "title": alert.title,
            "message": alert.message,
            "category": alert.category,
            "distance_m": round(alert.distance_m) if alert.distance_m is not None else None,
            "proximity": round(alert.proximity, 3) if alert.proximity is not None else None,
            "is_read": alert.is_read,
            "delivered": alert.delivered,
            "created_at": _iso(alert.timestamp),
            "read_at": _iso(alert.read_at),
            "metadata": alert.metadata_json or {},
            "post_preview": post.content[:140] if post else None,
        }

    # -- Push subscriptions --

    def save_push_subscription(
        self,
        user_id: str | uuid.UUID,
        endpoint: str,
        p256dh: str | None,
        auth: str | None,
        user_agent: str | None,
    ) -> WebPushSubscription:
        parsed_user_id = _parse_uuid(user_id)
        subscription = self.session.scalar(
            select(WebPushSubscription).where(
                WebPushSubscription.user_id == parsed_user_id,
                WebPushSubscription.endpoint == endpoint,
            )
        )
        if subscription is None:
            subscription = WebPushSubscription(
                user_id=parsed_user_id,
                endpoint=endpoint,
                p256dh=p256dh,
                auth=auth,
                user_agent=user_agent,
            )
            self.session.add(subscription)
        else:
            subscription.p256dh = p256dh
            subscription.auth = auth
            subscription.user_agent = user_agent
            subscription.enabled = True
            subscription.updated_at = datetime.now(timezone.utc)
        self.session.flush()
        return subscription

    def record_event(
        self,
        event_type: str,
        user_id: str | uuid.UUID | None = None,
        post_id: str | uuid.UUID | None = None,
        metadata: dict | None = None,
    ) -> None:
        self.session.add(
            ObservabilityEvent(
                event_type=event_type,
                user_id=_parse_uuid(user_id) if user_id else None,
                post_id=_parse_uuid(post_id) if post_id else None,
                metadata_json=metadata or {},
            )
        )

    # -- Analytics and leaderboard --

    def analytics_overview(self) -> dict:
        total_users = self.session.scalar(select(func.count()).select_from(User)) or 0
        total_accounts = self.session.scalar(select(func.count()).select_from(AuthAccount)) or 0
        total_posts = self.session.scalar(select(func.count()).select_from(Post)) or 0
        total_votes = self.session.scalar(select(func.count()).select_from(Interaction)) or 0
        located_posts = self.session.scalar(
            select(func.count()).select_from(Post).where(Post.lat.is_not(None), Post.lon.is_not(None))
        ) or 0
        avg_credibility = self.session.scalar(select(func.avg(Post.c_final))) or 0.0
        avg_urgency = self.session.scalar(select(func.avg(Post.urgency))) or 0.0
        high_trust_posts = self.session.scalar(
            select(func.count()).select_from(Post).where(Post.c_final >= 0.75)
        ) or 0
        suspicious_posts = self.session.scalar(
            select(func.count()).select_from(Post).where(Post.c_final < 0.4)
        ) or 0
        active_voters = self.session.scalar(
            select(func.count(func.distinct(Interaction.user_id)))
        ) or 0
        unread_alerts = self.session.scalar(
            select(func.count()).select_from(Alert).where(Alert.is_read.is_(False))
        ) or 0
        open_reports = self.session.scalar(
            select(func.count()).select_from(ContentReport).where(ContentReport.status == "pending")
        ) or 0

        return {
            "total_users": total_users,
            "total_accounts": total_accounts,
            "total_posts": total_posts,
            "total_votes": total_votes,
            "located_posts": located_posts,
            "active_voters": active_voters,
            "avg_credibility": round(_score(avg_credibility, 0.0), 3),
            "avg_urgency": round(_score(avg_urgency, 0.0), 3),
            "high_trust_posts": high_trust_posts,
            "suspicious_posts": suspicious_posts,
            "unread_alerts": unread_alerts,
            "open_reports": open_reports,
            "vote_density": round(total_votes / total_posts, 2) if total_posts else 0.0,
        }

    def credibility_distribution(self) -> dict:
        posts = list(self.session.scalars(select(Post.c_final)).all())
        buckets = [
            {"key": "low", "label": "Low", "min": 0.0, "max": 0.4, "count": 0},
            {"key": "uncertain", "label": "Uncertain", "min": 0.4, "max": 0.6, "count": 0},
            {"key": "credible", "label": "Credible", "min": 0.6, "max": 0.75, "count": 0},
            {"key": "verified", "label": "Verified", "min": 0.75, "max": 1.0, "count": 0},
        ]

        for value in posts:
            score = _score(value, 0.5)
            if score < 0.4:
                buckets[0]["count"] += 1
            elif score < 0.6:
                buckets[1]["count"] += 1
            elif score < 0.75:
                buckets[2]["count"] += 1
            else:
                buckets[3]["count"] += 1

        total = len(posts)
        return {
            "total": total,
            "buckets": [
                {
                    **bucket,
                    "percent": round((bucket["count"] / total) * 100, 1) if total else 0.0,
                }
                for bucket in buckets
            ],
        }

    def propagation_stats(self) -> dict:
        posts = list(self.session.scalars(select(Post.radius)).all())
        tiers = [
            {"key": "hyperlocal", "label": "Hyperlocal", "radius_km": 1, "count": 0},
            {"key": "local", "label": "Local", "radius_km": 5, "count": 0},
            {"key": "district", "label": "District", "radius_km": 10, "count": 0},
            {"key": "regional", "label": "Regional", "radius_km": 25, "count": 0},
            {"key": "wide", "label": "Wide", "radius_km": 50, "count": 0},
        ]

        for radius in posts:
            radius_km = _score(radius, 1000.0) / 1000
            if radius_km <= 1:
                tiers[0]["count"] += 1
            elif radius_km <= 5:
                tiers[1]["count"] += 1
            elif radius_km <= 10:
                tiers[2]["count"] += 1
            elif radius_km <= 25:
                tiers[3]["count"] += 1
            else:
                tiers[4]["count"] += 1

        total = len(posts)
        return {
            "total": total,
            "tiers": [
                {
                    **tier,
                    "percent": round((tier["count"] / total) * 100, 1) if total else 0.0,
                }
                for tier in tiers
            ],
        }

    def leaderboard(self, limit: int = 10) -> list[dict]:
        users = list(self.session.scalars(select(User)).all())
        rows: list[dict] = []

        for user in users:
            account = self.get_account_by_user_id(user.user_id)
            trust_score = _score(user.trust_score, 0.5)
            vote_count = self.vote_count(user.user_id)
            post_count = self.post_count(user.user_id)
            weight = self.user_weight(user)
            rows.append({
                "user_id": str(user.user_id),
                "name": account.name if account else "Community member",
                "role": account.role if account else "member",
                "trust_score": round(trust_score, 3),
                "weight": round(weight, 3),
                "r_star": round(_score(user.r_star, 0.5), 3),
                "exp_score": round(_score(user.exp_score, 0.0), 3),
                "anomaly_score": round(_score(user.anomaly_score, 0.0), 3),
                "location_confidence": round(_score(user.location_confidence, 0.5), 3),
                "vote_count": vote_count,
                "post_count": post_count,
                "points": user.points or 0,
                "daily_streak": user.current_daily_streak or 0,
                "weekly_streak": user.current_weekly_streak or 0,
                "city": user.city,
                "badge": self.trust_badge(trust_score, vote_count, post_count),
                "created_at": _iso(user.created_at),
            })

        rows.sort(
            key=lambda item: (
                item["trust_score"],
                item["weight"],
                item["vote_count"],
                item["post_count"],
            ),
            reverse=True,
        )
        return rows[:max(1, min(limit, 50))]

    def city_leaderboard(self, city: str | None, limit: int = 20) -> dict:
        normalized_city = _clean_text(city, 120) if city else None
        query = select(User)
        if normalized_city:
            query = query.where(func.lower(User.city) == normalized_city.lower())
        users = list(self.session.scalars(query).all())
        rows = []
        for user in users:
            account = self.get_account_by_user_id(user.user_id)
            vote_count = self.vote_count(user.user_id)
            post_count = self.post_count(user.user_id)
            trust_score = _score(user.trust_score, 0.5)
            rows.append({
                "user_id": str(user.user_id),
                "name": account.name if account else "Community member",
                "city": user.city or "Unknown",
                "trust_score": round(trust_score, 3),
                "weight": round(self.user_weight(user), 3),
                "points": user.points or 0,
                "vote_count": vote_count,
                "post_count": post_count,
                "daily_streak": user.current_daily_streak or 0,
                "weekly_streak": user.current_weekly_streak or 0,
                "badge": self.trust_badge(trust_score, vote_count, post_count),
            })
        rows.sort(
            key=lambda item: (
                item["trust_score"],
                item["points"],
                item["vote_count"],
                item["post_count"],
            ),
            reverse=True,
        )
        return {
            "city": normalized_city or "All cities",
            "users": rows[:max(1, min(limit, 100))],
        }

    def trust_badge(self, trust_score: float, vote_count: int = 0, post_count: int = 0) -> dict:
        if trust_score >= 0.9 and vote_count >= 20:
            return {"key": "expert", "label": "Expert", "level": 5}
        if trust_score >= 0.75:
            return {"key": "trusted", "label": "Trusted", "level": 4}
        if trust_score >= 0.6 or vote_count >= 10:
            return {"key": "verifier", "label": "Verifier", "level": 3}
        if post_count >= 3 or vote_count >= 3:
            return {"key": "contributor", "label": "Contributor", "level": 2}
        return {"key": "newcomer", "label": "Newcomer", "level": 1}

    # -- Formula parity with previous MemoryStore --

    def user_weight(self, user: User) -> float:
        return (
            _score(user.trust_score, 0.5)
            * (1 - _score(user.anomaly_score, 0.0))
            * _score(user.exp_score, 0.0)
        )

    def _recompute_post(self, post: Post) -> None:
        interactions = list(self.session.scalars(
            select(Interaction)
            .where(Interaction.post_id == post.post_id)
            .order_by(Interaction.timestamp.asc())
        ).all())
        if not interactions:
            return

        s_plus = sum(_score(item.weight, 0.0) for item in interactions if item.vote > 0)
        s_minus = sum(_score(item.weight, 0.0) for item in interactions if item.vote < 0)
        n_eff = s_plus + s_minus

        alpha0, beta0 = 1.0, 1.0
        c_bayes = (alpha0 + s_plus) / (alpha0 + beta0 + n_eff)
        post.s_plus = s_plus
        post.s_minus = s_minus
        post.c_bayes = c_bayes
        post.c_final = c_bayes
        post.n_effective = n_eff
        if post.c_final >= 0.75 and n_eff >= 5 and _score(post.variance, 0.0) <= 0.2:
            post.radius = max(_score(post.radius, 1000.0), 5000.0)
        if post.c_final >= 0.85 and n_eff >= 10:
            post.radius = max(_score(post.radius, 1000.0), 50000.0)
            post.is_global = True

        if n_eff > 0:
            post.variance = sum(
                _score(item.weight, 0.0) * ((1 if item.vote > 0 else 0) - c_bayes) ** 2
                for item in interactions
            ) / n_eff
            if post.c_final >= 0.75 and n_eff >= 5 and post.variance <= 0.2:
                post.radius = max(_score(post.radius, 1000.0), 5000.0)
            if post.c_final >= 0.85 and n_eff >= 10 and post.variance <= 0.18:
                post.radius = max(_score(post.radius, 1000.0), 50000.0)
                post.is_global = True
        post.updated_at = datetime.now(timezone.utc)

    def _update_reliability(self, user: User) -> None:
        interactions = list(self.session.scalars(
            select(Interaction).where(Interaction.user_id == user.user_id)
        ).all())
        alpha = 0.0
        beta = 0.0

        for interaction in interactions:
            post = self.get_post(interaction.post_id)
            if not post:
                continue
            is_correct = (
                (interaction.vote > 0 and _score(post.c_final, 0.5) >= 0.5)
                or (interaction.vote < 0 and _score(post.c_final, 0.5) < 0.5)
            )
            if is_correct:
                alpha += 1.0
            else:
                beta += 1.0

        user.alpha = alpha
        user.beta = beta
        total = alpha + beta
        if total > 0:
            user.r_score = alpha / total
            user.confidence = 1.0 - math.exp(-0.1 * total)
            user.r_star = user.r_score * user.confidence
        else:
            user.r_score = None
            user.confidence = None
            user.r_star = 0.5
        user.trust_score = user.r_star

    def _compute_urgency(self, content: str) -> float:
        keywords = {
            "fire": 1.0, "accident": 0.9, "urgent": 0.8, "help": 0.7,
            "emergency": 1.0, "danger": 0.9, "flood": 0.95, "earthquake": 1.0,
            "explosion": 1.0, "shooting": 1.0, "traffic": 0.4, "disruption": 0.5,
            "delayed": 0.4, "blocked": 0.5, "air quality": 0.6,
        }
        words = content.lower().split()
        max_score = 0.0
        for word in words:
            if word in keywords:
                max_score = max(max_score, keywords[word])
        return max_score

    def normalize_category(self, category: str | None) -> str:
        normalized = (category or "other").strip().lower().replace(" ", "-")
        aliases = {
            "local": "civic",
            "public-safety": "emergency",
            "crime-news": "crime",
            "road": "traffic",
            "roads": "traffic",
        }
        normalized = aliases.get(normalized, normalized)
        if normalized == "all":
            return "all"
        return normalized if normalized in VALID_CATEGORIES else "other"

    def infer_category(self, content: str) -> str:
        text = content.lower()
        keyword_map = {
            "emergency": ["fire", "flood", "earthquake", "explosion", "urgent", "danger", "help"],
            "traffic": ["traffic", "road", "blocked", "accident", "metro", "bus", "jam"],
            "weather": ["rain", "storm", "weather", "heat", "snow", "fog"],
            "crime": ["theft", "crime", "police", "shooting", "robbery"],
            "health": ["hospital", "health", "disease", "clinic", "ambulance"],
            "sports": ["match", "sports", "tournament", "cricket", "football"],
            "politics": ["election", "minister", "party", "policy", "government"],
            "business": ["market", "business", "stock", "company", "price"],
            "education": ["school", "college", "exam", "university"],
            "environment": ["pollution", "air quality", "river", "forest"],
        }
        for category, keywords in keyword_map.items():
            if any(keyword in text for keyword in keywords):
                return category
        return "other"

    def why_shown(self, post: Post, distance_m: float | None = None) -> list[str]:
        reasons = []
        credibility = _score(post.c_final, 0.5)
        urgency = _score(post.urgency, 0.0)
        if credibility >= 0.7:
            reasons.append("high credibility")
        elif credibility >= 0.45:
            reasons.append("community review in progress")
        if urgency >= 0.4:
            reasons.append("urgent local keywords")
        if distance_m is not None:
            if distance_m <= 1000:
                reasons.append("within 1 km")
            else:
                reasons.append(f"{round(distance_m / 1000, 1)} km away")
        if post.category and post.category != "other":
            reasons.append(f"{post.category} category")
        if post.is_global:
            reasons.append("global reach")
        return reasons[:4]

    def explain_post(
        self,
        post_id: str | uuid.UUID,
        viewer_id: str | uuid.UUID | None = None,
        lat: float | None = None,
        lon: float | None = None,
    ) -> dict:
        post = self.get_post(post_id)
        if post is None:
            raise ValueError("Post not found")
        interactions = list(self.session.scalars(
            select(Interaction).where(Interaction.post_id == post.post_id)
        ).all())

        contribution_rows = []
        for interaction in interactions:
            user = self.get_user(interaction.user_id)
            contribution_rows.append({
                "user_id": str(interaction.user_id),
                "vote": interaction.vote,
                "weight": round(_score(interaction.weight, 0.0), 3),
                "trust_score": round(_score(user.trust_score if user else None, 0.5), 3),
                "experience": round(_score(user.exp_score if user else None, 0.0), 3),
                "anomaly": round(_score(user.anomaly_score if user else None, 0.0), 3),
                "timestamp": _iso(interaction.timestamp),
            })
        contribution_rows.sort(key=lambda item: item["weight"], reverse=True)

        distance = None
        proximity = None
        if lat is not None and lon is not None and post.lat is not None and post.lon is not None:
            distance = self.haversine(lat, lon, post.lat, post.lon)
            location_conf = 0.5
            if viewer_id:
                viewer = self.get_user(viewer_id)
                location_conf = _score(viewer.location_confidence if viewer else None, 0.5)
            proximity = location_conf * math.exp(-(distance ** 2) / (2 * (1000.0 ** 2)))

        credibility = _score(post.c_final, 0.5)
        urgency = _score(post.urgency, 0.0)
        variance = _score(post.variance, 0.0)
        n_eff = _score(post.n_effective, 0.0)
        alert_score = credibility * urgency

        return {
            "post_id": str(post.post_id),
            "summary": {
                "credibility": round(credibility, 3),
                "category": post.category,
                "urgency": round(urgency, 3),
                "evidence_mass": round(n_eff, 3),
                "variance": round(variance, 3),
                "radius_m": round(_score(post.radius, 1000.0)),
                "is_global": post.is_global,
            },
            "credibility_components": {
                "c_bayes": round(_score(post.c_bayes, 0.5), 3),
                "c_ml": round(_score(post.c_ml, 0.5), 3) if post.c_ml is not None else None,
                "c_memory": round(_score(post.c_memory, 0.5), 3) if post.c_memory is not None else None,
                "positive_signal": round(_score(post.s_plus, 0.0), 3),
                "negative_signal": round(_score(post.s_minus, 0.0), 3),
            },
            "decision_trace": {
                "propagation": [
                    {"label": "Credibility >= 0.75", "passed": credibility >= 0.75, "value": round(credibility, 3)},
                    {"label": "Evidence mass >= 5", "passed": n_eff >= 5, "value": round(n_eff, 3)},
                    {"label": "Variance <= 0.20", "passed": variance <= 0.20, "value": round(variance, 3)},
                ],
                "alert": [
                    {"label": "Credibility x urgency >= 0.25", "passed": alert_score >= 0.25, "value": round(alert_score, 3)},
                    {"label": "Urgency >= 0.40", "passed": urgency >= 0.40, "value": round(urgency, 3)},
                    {
                        "label": "Within hyperlocal radius",
                        "passed": distance is None or distance <= 1000,
                        "value": round(distance) if distance is not None else None,
                    },
                    {"label": "Variance <= 0.25", "passed": variance <= 0.25, "value": round(variance, 3)},
                ],
            },
            "spatial": {
                "distance_m": round(distance) if distance is not None else None,
                "proximity": round(proximity, 3) if proximity is not None else None,
                "within_1km": bool(distance is not None and distance <= 1000),
            },
            "why_shown": self.why_shown(post, distance),
            "top_contributors": contribution_rows[:8],
        }

    def _touch_activity(self, user: User, points: int = 0) -> None:
        now = datetime.now(timezone.utc)
        today = now.date()
        last_date = user.last_activity_date.date() if user.last_activity_date else None
        if last_date is None:
            user.current_daily_streak = max(1, user.current_daily_streak or 0)
        elif last_date == today:
            pass
        elif last_date == today - timedelta(days=1):
            user.current_daily_streak = (user.current_daily_streak or 0) + 1
        else:
            user.current_daily_streak = 1

        week_changed = last_date is None or last_date.isocalendar()[:2] != today.isocalendar()[:2]
        if week_changed:
            user.current_weekly_streak = (user.current_weekly_streak or 0) + 1
        else:
            user.current_weekly_streak = max(1, user.current_weekly_streak or 0)

        user.best_daily_streak = max(user.best_daily_streak or 0, user.current_daily_streak or 0)
        user.best_weekly_streak = max(user.best_weekly_streak or 0, user.current_weekly_streak or 0)
        user.last_activity_date = now
        user.points = (user.points or 0) + points

    @staticmethod
    def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        radius = 6371000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
        return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _parse_uuid(value: str | uuid.UUID) -> uuid.UUID:
    if isinstance(value, uuid.UUID):
        return value
    return uuid.UUID(str(value))


def _score(value: float | None, default: float) -> float:
    return default if value is None else float(value)


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def _clean_text(value: str | None, limit: int) -> str:
    return " ".join(str(value or "").strip().split())[:limit]
