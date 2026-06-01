"""
Webapp API Server — Production User-Facing Backend.

The user-facing webapp is database-backed only. PostgreSQL must be available
and migrations must be applied before serving production traffic.
"""

from __future__ import annotations

import os
import re
import sys
import asyncio
import json
import time
from collections import Counter, deque
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from webapp.db import dispose_webapp_database, get_database_kind, get_db, init_webapp_database
from webapp.models import AuthAccount
from webapp.security import (
    AuthError,
    TOKEN_TTL_SECONDS,
    create_access_token,
    hash_password,
    verify_google_id_token,
    verify_access_token,
    verify_password,
)
from webapp.store import DuplicateReportError, DuplicateVoteError, VALID_CATEGORIES, WebappStore


auth_scheme = HTTPBearer(auto_error=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_webapp_database()
    yield
    dispose_webapp_database()


app = FastAPI(title="NCPS — User App", version="1.0.0", lifespan=lifespan)

METRICS = Counter()
RECENT_EVENTS = deque(maxlen=80)
ALERT_SUBSCRIBERS: dict[str, set[asyncio.Queue]] = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def observability_middleware(request: Request, call_next):
    start = time.perf_counter()
    METRICS["requests_total"] += 1
    METRICS[f"method_{request.method.lower()}"] += 1
    try:
        response = await call_next(request)
    except Exception:
        METRICS["requests_failed"] += 1
        raise

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    METRICS["latency_total_ms"] += elapsed_ms
    if response.status_code >= 500:
        METRICS["responses_5xx"] += 1
    elif response.status_code >= 400:
        METRICS["responses_4xx"] += 1
    else:
        METRICS["responses_2xx"] += 1

    response.headers["X-NCPS-Latency-Ms"] = str(elapsed_ms)
    return response

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
webapp_dir = os.path.join(os.path.dirname(_backend_dir), "webapp")


class CreatePostRequest(BaseModel):
    user_id: str | None = None
    content: str = Field(..., min_length=1, max_length=5000)
    category: str | None = Field(None, max_length=32)
    lat: float | None = None
    lon: float | None = None


class VoteRequest(BaseModel):
    user_id: str | None = None
    post_id: str
    vote: int = Field(..., description="+1 or -1")


class LocationRequest(BaseModel):
    user_id: str | None = None
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    city: str | None = Field(None, max_length=120)
    country: str | None = Field(None, max_length=120)


class PreferenceRequest(BaseModel):
    followed_topics: list[str] | None = None
    alerts_enabled: bool | None = None
    breaking_only: bool | None = None
    alert_radius_m: float | None = Field(None, ge=250, le=10000)
    feed_radius_m: float | None = Field(None, ge=1000, le=100000)
    city: str | None = Field(None, max_length=120)


class ReportPostRequest(BaseModel):
    reason: str = Field("other", max_length=64)
    description: str | None = Field(None, max_length=2000)


class PushSubscriptionRequest(BaseModel):
    endpoint: str = Field(..., min_length=10, max_length=4096)
    keys: dict = Field(default_factory=dict)
    user_agent: str | None = Field(None, max_length=500)


class AuthRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        name = " ".join(value.strip().split())
        if len(name) < 2:
            raise ValueError("Name must contain at least 2 characters")
        return name

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            raise ValueError("Enter a valid email address")
        return email


class AuthLoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class AuthGoogleRequest(BaseModel):
    credential: str = Field(..., min_length=10)


def get_store(session: Session = Depends(get_db)) -> WebappStore:
    return WebappStore(session)


def record_metric_event(event_type: str, **payload) -> None:
    METRICS[f"event_{event_type}"] += 1
    RECENT_EVENTS.appendleft({
        "event_type": event_type,
        "timestamp": int(time.time()),
        "payload": payload,
    })


def publish_alert(alert: dict) -> None:
    user_id = str(alert.get("user_id") or alert.get("recipient_user_id") or "")
    if not user_id:
        return
    for queue in list(ALERT_SUBSCRIBERS.get(user_id, set())):
        try:
            queue.put_nowait(alert)
        except asyncio.QueueFull:
            pass


def publish_alerts(alerts: list[dict]) -> None:
    for alert in alerts:
        publish_alert(alert)


def _auth_response(store: WebappStore, account: AuthAccount) -> dict:
    store.touch_login(account)
    token = create_access_token(str(account.user_id), account.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": TOKEN_TTL_SECONDS,
        "user": store.account_public(account),
    }


def _unauthorized(detail: str = "Authentication required") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_account(
    credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme),
    store: WebappStore = Depends(get_store),
) -> AuthAccount:
    if not credentials:
        raise _unauthorized()
    try:
        payload = verify_access_token(credentials.credentials)
    except AuthError as exc:
        raise _unauthorized(str(exc)) from exc

    account = store.get_account_by_user_id(str(payload.get("sub")))
    if account is None or account.disabled:
        raise _unauthorized("Account is not active")
    return account


def get_optional_account(
    credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme),
    store: WebappStore = Depends(get_store),
) -> AuthAccount | None:
    if not credentials:
        return None
    try:
        return get_current_account(credentials, store)
    except HTTPException:
        return None


def get_account_from_raw_token(token: str, store: WebappStore) -> AuthAccount:
    try:
        payload = verify_access_token(token)
    except AuthError as exc:
        raise _unauthorized(str(exc)) from exc
    account = store.get_account_by_user_id(str(payload.get("sub")))
    if account is None or account.disabled:
        raise _unauthorized("Account is not active")
    return account


def _can_read_user(requested_user_id: str, account: AuthAccount) -> bool:
    return requested_user_id == str(account.user_id) or account.role == "admin"


@app.get("/")
def index():
    return FileResponse(os.path.join(webapp_dir, "index.html"))


@app.get("/report.html")
def report_page():
    return FileResponse(os.path.join(webapp_dir, "report.html"))


@app.get("/map.html")
def map_page():
    return FileResponse(os.path.join(webapp_dir, "map.html"))


@app.get("/profile.html")
def profile_page():
    return FileResponse(os.path.join(webapp_dir, "profile.html"))


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "database", "database": get_database_kind(), "version": "1.0.0"}


@app.post("/api/auth/register")
def auth_register(req: AuthRegisterRequest, store: WebappStore = Depends(get_store)):
    if store.get_account_by_email(req.email) is not None:
        raise HTTPException(status_code=409, detail="Email is already registered")
    account = store.create_account(req.name, req.email, hash_password(req.password))
    return _auth_response(store, account)


@app.post("/api/auth/login")
def auth_login(req: AuthLoginRequest, store: WebappStore = Depends(get_store)):
    account = store.get_account_by_email(req.email)
    if account is None or not verify_password(req.password, account.password_hash):
        raise _unauthorized("Invalid email or password")
    if account.disabled:
        raise _unauthorized("Account is disabled")
    return _auth_response(store, account)


@app.post("/api/auth/google")
def auth_google(req: AuthGoogleRequest, store: WebappStore = Depends(get_store)):
    try:
        google_profile = verify_google_id_token(req.credential)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    account = store.create_or_update_google_account(google_profile)
    record_metric_event("google_login", user_id=str(account.user_id))
    return _auth_response(store, account)


@app.get("/api/auth/me")
def auth_me(
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    return {"user": store.account_public(account)}


@app.post("/api/auth/logout")
def auth_logout(account: AuthAccount = Depends(get_current_account)):
    return {"status": "ok", "user_id": str(account.user_id)}


@app.get("/api/feed")
def get_feed(
    lat: float | None = None,
    lon: float | None = None,
    limit: int = 50,
    category: str | None = None,
    mode: str = "local",
    radius_m: float | None = None,
    account: AuthAccount | None = Depends(get_optional_account),
    store: WebappStore = Depends(get_store),
):
    if category and category not in VALID_CATEGORIES and category != "all":
        raise HTTPException(status_code=400, detail="Unsupported category")
    mode = mode if mode in {"local", "global"} else "local"
    posts = store.get_feed(lat, lon, limit, category=category, mode=mode, radius_m=radius_m)
    viewer_id = str(account.user_id) if account else None
    return {
        "posts": [store.post_to_dict(post, lat, lon, viewer_id) for post in posts],
        "total": len(posts),
        "filters": {"category": category or "all", "mode": mode, "radius_m": radius_m},
    }


@app.get("/api/analytics/overview")
def analytics_overview(store: WebappStore = Depends(get_store)):
    return store.analytics_overview()


@app.get("/api/analytics/credibility-distribution")
def analytics_credibility_distribution(store: WebappStore = Depends(get_store)):
    return store.credibility_distribution()


@app.get("/api/analytics/propagation-stats")
def analytics_propagation_stats(store: WebappStore = Depends(get_store)):
    return store.propagation_stats()


@app.get("/api/analytics/leaderboard")
def analytics_leaderboard(limit: int = 10, store: WebappStore = Depends(get_store)):
    return {"users": store.leaderboard(limit), "limit": max(1, min(limit, 50))}


@app.get("/api/analytics/city-leaderboard")
def analytics_city_leaderboard(
    city: str | None = None,
    limit: int = 20,
    account: AuthAccount | None = Depends(get_optional_account),
    store: WebappStore = Depends(get_store),
):
    if not city and account:
        user = store.get_user(account.user_id)
        city = user.city if user else None
    return store.city_leaderboard(city, limit)


@app.get("/api/observability/metrics")
def observability_metrics(account: AuthAccount = Depends(get_current_account)):
    total = METRICS["requests_total"] or 1
    return {
        "status": "ok",
        "requests_total": METRICS["requests_total"],
        "responses_2xx": METRICS["responses_2xx"],
        "responses_4xx": METRICS["responses_4xx"],
        "responses_5xx": METRICS["responses_5xx"],
        "avg_latency_ms": round(METRICS["latency_total_ms"] / total, 2),
        "events": {
            key.removeprefix("event_"): value
            for key, value in METRICS.items()
            if key.startswith("event_")
        },
        "recent_events": list(RECENT_EVENTS)[:30],
    }


@app.post("/api/post/create")
def create_post(
    req: CreatePostRequest,
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    post = store.create_post(str(account.user_id), req.content, req.lat, req.lon, req.category)
    alerts = [store.alert_to_dict(alert) for alert in store.generate_alerts_for_post(post.post_id, source="post")]
    publish_alerts(alerts)
    record_metric_event("post_created", user_id=str(account.user_id), post_id=str(post.post_id), alerts=len(alerts))
    return {
        "post_id": str(post.post_id),
        "user_id": str(account.user_id),
        "credibility": post.c_final,
        "urgency": post.urgency,
        "category": post.category,
        "alerts_created": len(alerts),
        "message": "Post created. Credibility will update as the community votes.",
    }


@app.post("/api/post/vote")
def vote_post(
    req: VoteRequest,
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    if req.vote not in (-1, 1):
        raise HTTPException(400, "Vote must be +1 or -1")
    try:
        result = store.vote(str(account.user_id), req.post_id, req.vote)
    except DuplicateVoteError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    publish_alerts(result.get("alerts", []))
    record_metric_event("vote_recorded", user_id=str(account.user_id), post_id=result["post_id"], alerts=len(result.get("alerts", [])))
    return {
        "interaction_id": result["interaction_id"],
        "post_id": result["post_id"],
        "updated_credibility": round(result["updated_credibility"], 3),
        "alerts_created": len(result.get("alerts", [])),
        "message": "Vote recorded",
    }


@app.get("/api/post/{post_id}")
def get_post(
    post_id: str,
    account: AuthAccount | None = Depends(get_optional_account),
    store: WebappStore = Depends(get_store),
):
    post = store.get_post(post_id)
    if post is None:
        raise HTTPException(404, "Post not found")
    return store.post_to_dict(post, viewer_id=str(account.user_id) if account else None)


@app.post("/api/user/location")
def update_location(
    req: LocationRequest,
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    user = store.update_location(str(account.user_id), req.lat, req.lon, req.city, req.country)
    record_metric_event("location_updated", user_id=str(account.user_id))
    return {
        "user_id": str(account.user_id),
        "location_confidence": round(user.location_confidence or 0.5, 3),
        "city": user.city,
        "message": "Location updated",
    }


@app.get("/api/user/me/state")
def get_my_user_state(
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    user = store.get_or_create_user(account.user_id)
    return store.user_state_to_dict(user, account)


@app.get("/api/user/me/activity")
def get_my_activity(
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    posts = store.recent_posts(account.user_id, limit=8)
    votes = store.recent_votes(account.user_id, limit=8)
    return {
        "posts": [store.post_to_dict(post, viewer_id=account.user_id) for post in posts],
        "votes": [store.vote_activity_to_dict(vote) for vote in votes],
    }


@app.get("/api/user/{user_id}/state")
def get_user_state(
    user_id: str,
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    if not _can_read_user(user_id, account):
        raise HTTPException(status_code=403, detail="You can only view your own profile")
    user = store.get_user(user_id)
    if user is None:
        raise HTTPException(404, "User not found")
    return store.user_state_to_dict(user, store.get_account_by_user_id(user_id))


@app.get("/api/preferences")
def get_preferences(
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    preferences = store.get_or_create_preferences(account.user_id)
    return {"preferences": store.preferences_to_dict(preferences)}


@app.put("/api/preferences")
def update_preferences(
    req: PreferenceRequest,
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    preferences = store.update_preferences(
        account.user_id,
        followed_topics=req.followed_topics,
        alerts_enabled=req.alerts_enabled,
        breaking_only=req.breaking_only,
        alert_radius_m=req.alert_radius_m,
        feed_radius_m=req.feed_radius_m,
        city=req.city,
    )
    record_metric_event("preferences_updated", user_id=str(account.user_id))
    return {"preferences": store.preferences_to_dict(preferences)}


@app.get("/api/alerts")
def get_alerts(
    unread_only: bool = False,
    limit: int = 50,
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    alerts = store.list_alerts(account.user_id, unread_only=unread_only, limit=limit)
    return {
        "alerts": [store.alert_to_dict(alert) for alert in alerts],
        "unread_count": store.unread_alert_count(account.user_id),
    }


@app.patch("/api/alerts/read-all")
def mark_all_alerts_read(
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    modified = store.mark_all_alerts_read(account.user_id)
    return {"modified_count": modified, "unread_count": store.unread_alert_count(account.user_id)}


@app.patch("/api/alerts/{alert_id}/read")
def mark_alert_read(
    alert_id: str,
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    try:
        alert = store.mark_alert_read(account.user_id, alert_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"alert": store.alert_to_dict(alert), "unread_count": store.unread_alert_count(account.user_id)}


@app.get("/api/alerts/stream")
async def stream_alerts(token: str, store: WebappStore = Depends(get_store)):
    account = get_account_from_raw_token(token, store)
    user_id = str(account.user_id)
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    ALERT_SUBSCRIBERS.setdefault(user_id, set()).add(queue)

    async def event_generator():
        try:
            yield "event: ready\ndata: {\"status\":\"connected\"}\n\n"
            while True:
                try:
                    alert = await asyncio.wait_for(queue.get(), timeout=20)
                    yield "event: alert\ndata: {}\n\n".format(json.dumps(alert))
                except asyncio.TimeoutError:
                    yield "event: ping\ndata: {}\n\n"
        finally:
            ALERT_SUBSCRIBERS.get(user_id, set()).discard(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/notifications/subscribe")
def save_push_subscription(
    req: PushSubscriptionRequest,
    request: Request,
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    keys = req.keys or {}
    subscription = store.save_push_subscription(
        account.user_id,
        req.endpoint,
        keys.get("p256dh"),
        keys.get("auth"),
        req.user_agent or request.headers.get("user-agent"),
    )
    record_metric_event("push_subscription_saved", user_id=str(account.user_id))
    return {
        "subscription_id": str(subscription.subscription_id),
        "enabled": subscription.enabled,
        "web_push_ready": bool(os.getenv("NCPS_VAPID_PRIVATE_KEY") and os.getenv("NCPS_VAPID_PUBLIC_KEY")),
    }


@app.get("/api/notifications/config")
def notification_config():
    return {
        "vapid_public_key": os.getenv("NCPS_VAPID_PUBLIC_KEY"),
        "web_push_ready": bool(os.getenv("NCPS_VAPID_PRIVATE_KEY") and os.getenv("NCPS_VAPID_PUBLIC_KEY")),
        "sse_ready": True,
    }


@app.post("/api/post/{post_id}/share")
def share_post(
    post_id: str,
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    try:
        result = store.share_post(account.user_id, post_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    record_metric_event("post_shared", user_id=str(account.user_id), post_id=post_id)
    return result


@app.post("/api/post/{post_id}/bookmark")
def bookmark_post(
    post_id: str,
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    try:
        result = store.bookmark_post(account.user_id, post_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    record_metric_event("post_bookmarked", user_id=str(account.user_id), post_id=post_id)
    return result


@app.delete("/api/post/{post_id}/bookmark")
def unbookmark_post(
    post_id: str,
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    try:
        result = store.unbookmark_post(account.user_id, post_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return result


@app.post("/api/post/{post_id}/report")
def report_post(
    post_id: str,
    req: ReportPostRequest,
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    try:
        result = store.report_post(account.user_id, post_id, req.reason, req.description)
    except DuplicateReportError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    record_metric_event("post_reported", user_id=str(account.user_id), post_id=post_id, reason=req.reason)
    return result


@app.get("/api/post/{post_id}/explain")
def explain_post(
    post_id: str,
    lat: float | None = None,
    lon: float | None = None,
    account: AuthAccount | None = Depends(get_optional_account),
    store: WebappStore = Depends(get_store),
):
    try:
        return store.explain_post(post_id, viewer_id=account.user_id if account else None, lat=lat, lon=lon)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/user/me/bookmarks")
def get_my_bookmarks(
    account: AuthAccount = Depends(get_current_account),
    store: WebappStore = Depends(get_store),
):
    posts = store.saved_posts(account.user_id)
    return {"posts": [store.post_to_dict(post, viewer_id=account.user_id) for post in posts]}


if __name__ == "__main__":
    import uvicorn
    print("\n  NCPS Webapp — http://localhost:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
