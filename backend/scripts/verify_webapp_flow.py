"""
Run a real HTTP multi-user verification flow against the NCPS webapp API.

Examples:
  python scripts/verify_webapp_flow.py --base-url http://127.0.0.1:8765
  python scripts/verify_webapp_flow.py --base-url https://your-render-service.onrender.com

The script creates fresh unique accounts on every run.
"""

from __future__ import annotations

import argparse
import json
import secrets
import sys
import time
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


@dataclass
class Account:
    name: str
    email: str
    password: str
    token: str
    user: dict[str, Any]


class ApiError(RuntimeError):
    def __init__(self, method: str, url: str, status: int | None, body: str):
        self.method = method
        self.url = url
        self.status = status
        self.body = body
        super().__init__(f"{method} {url} failed with {status}: {body}")


def normalize_base_url(raw_base_url: str) -> str:
    base_url = raw_base_url.rstrip("/")
    if base_url.endswith("/api"):
        base_url = base_url[:-4]
    return base_url


def api_request(
    base_url: str,
    method: str,
    path: str,
    *,
    token: str | None = None,
    payload: dict[str, Any] | None = None,
    params: dict[str, Any] | None = None,
    expected_status: int = 200,
) -> dict[str, Any]:
    url = f"{base_url}/api{path}"
    if params:
        url = f"{url}?{urlencode(params)}"

    body = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=20) as response:
            response_body = response.read().decode("utf-8")
            if response.status != expected_status:
                raise ApiError(method, url, response.status, response_body)
            return json.loads(response_body) if response_body else {}
    except HTTPError as exc:
        response_body = exc.read().decode("utf-8")
        if exc.code == expected_status:
            return json.loads(response_body) if response_body else {}
        raise ApiError(method, url, exc.code, response_body) from exc
    except URLError as exc:
        raise ApiError(method, url, None, str(exc)) from exc


def assert_condition(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run_flow(base_url: str, user_count: int) -> dict[str, Any]:
    base_url = normalize_base_url(base_url)
    batch_id = f"{int(time.time())}-{secrets.token_hex(4)}"

    health = api_request(base_url, "GET", "/health")
    assert_condition(health.get("status") == "ok", "health endpoint did not return ok")

    accounts: list[Account] = []
    posts: list[dict[str, Any]] = []
    vote_total = 0

    for index in range(user_count):
        password = f"FlowPass{batch_id}{index}!"
        email = f"flow-user-{index + 1}-{batch_id}@example.com"
        name = f"Flow User {index + 1}"

        registered = api_request(
            base_url,
            "POST",
            "/auth/register",
            payload={"name": name, "email": email, "password": password},
        )
        assert_condition(registered["user"]["email"] == email, "register returned wrong email")

        logged_in = api_request(
            base_url,
            "POST",
            "/auth/login",
            payload={"email": email, "password": password},
        )
        assert_condition(logged_in["user"]["email"] == email, "login returned wrong email")
        assert_condition(bool(logged_in.get("access_token")), "login did not return access token")

        account = Account(
            name=name,
            email=email,
            password=password,
            token=logged_in["access_token"],
            user=logged_in["user"],
        )
        accounts.append(account)

        location = api_request(
            base_url,
            "POST",
            "/user/location",
            token=account.token,
            payload={
                "lat": 28.60 + (index * 0.002),
                "lon": 77.20 + (index * 0.002),
                "city": "Delhi" if index < max(2, user_count // 2) else "Noida",
                "country": "India",
            },
        )
        assert_condition(location["location_confidence"] > 0.5, "location confidence did not increase")

    assert_condition(len({account.user["user_id"] for account in accounts}) == user_count, "user ids are not unique")

    for index, account in enumerate(accounts):
        created = api_request(
            base_url,
            "POST",
            "/post/create",
            token=account.token,
            payload={
                "content": (
                    "Urgent fire emergency reported near the market square."
                    if index == 0
                    else f"Live verification report {index + 1}: traffic and civic update near zone {index + 1}."
                ),
                "category": "emergency" if index == 0 else "traffic",
                "lat": 28.60 + (index * 0.002),
                "lon": 77.20 + (index * 0.002),
            },
        )
        assert_condition(created["user_id"] == account.user["user_id"], "post owner mismatch")
        assert_condition(created["credibility"] == 0.5, "new post should start at neutral credibility")
        posts.append(created)

    for post_index, post in enumerate(posts):
        for voter_index, account in enumerate(accounts):
            if voter_index == post_index:
                continue
            vote_value = 1 if voter_index % 3 != 0 else -1
            voted = api_request(
                base_url,
                "POST",
                "/post/vote",
                token=account.token,
                payload={"post_id": post["post_id"], "vote": vote_value},
            )
            assert_condition(voted["post_id"] == post["post_id"], "vote returned wrong post id")
            assert_condition(0.0 <= voted["updated_credibility"] <= 1.0, "credibility out of range")
            vote_total += 1

    duplicate = api_request(
        base_url,
        "POST",
        "/post/vote",
        token=accounts[1].token,
        payload={"post_id": posts[0]["post_id"], "vote": 1},
        expected_status=409,
    )
    assert_condition("already voted" in duplicate.get("detail", "").lower(), "duplicate vote was not rejected")

    feed = api_request(
        base_url,
        "GET",
        "/feed",
        token=accounts[0].token,
        params={"lat": 28.61, "lon": 77.21, "limit": max(100, user_count * 5), "category": "traffic"},
    )
    feed_ids = {post["post_id"] for post in feed["posts"]}
    traffic_ids = {post["post_id"] for post in posts[1:]}
    assert_condition(traffic_ids.issubset(feed_ids), "category feed did not include all traffic posts")

    global_feed = api_request(
        base_url,
        "GET",
        "/feed",
        token=accounts[0].token,
        params={"mode": "global", "limit": max(50, user_count * 3)},
    )
    assert_condition(len(global_feed["posts"]) > 0, "global feed returned no posts")

    detail = api_request(base_url, "GET", f"/post/{posts[0]['post_id']}", token=accounts[1].token)
    assert_condition(detail["vote_count"] == user_count - 1, "post detail has wrong vote count")
    assert_condition(detail["user_vote"] in (-1, 1), "post detail missing viewer vote")
    assert_condition(detail["can_vote"] is False, "post detail allowed duplicate vote")
    assert_condition(detail["n_effective"] > 0, "post detail did not compute effective evidence")
    assert_condition(detail["category"] == "emergency", "post detail missing category")
    assert_condition(isinstance(detail.get("why_shown"), list), "post detail missing explainability hints")

    explain = api_request(base_url, "GET", f"/post/{posts[0]['post_id']}/explain", token=accounts[1].token)
    assert_condition(explain["summary"]["category"] == "emergency", "explain endpoint category mismatch")
    assert_condition("decision_trace" in explain, "explain endpoint missing decision trace")

    shared = api_request(base_url, "POST", f"/post/{posts[0]['post_id']}/share", token=accounts[1].token)
    assert_condition(shared["shares_count"] >= 1, "share endpoint did not increment count")

    bookmarked = api_request(base_url, "POST", f"/post/{posts[0]['post_id']}/bookmark", token=accounts[1].token)
    assert_condition(bookmarked["bookmarked"] is True, "bookmark endpoint did not save post")
    bookmarks = api_request(base_url, "GET", "/user/me/bookmarks", token=accounts[1].token)
    assert_condition(any(item["post_id"] == posts[0]["post_id"] for item in bookmarks["posts"]), "saved bookmarks missing post")

    reported = api_request(
        base_url,
        "POST",
        f"/post/{posts[0]['post_id']}/report",
        token=accounts[1].token,
        payload={"reason": "misinformation", "description": "Needs moderator review"},
    )
    assert_condition(reported["reports_count"] >= 1, "report endpoint did not increment count")
    duplicate_report = api_request(
        base_url,
        "POST",
        f"/post/{posts[0]['post_id']}/report",
        token=accounts[1].token,
        payload={"reason": "misinformation"},
        expected_status=409,
    )
    assert_condition("already reported" in duplicate_report.get("detail", "").lower(), "duplicate report was not rejected")

    notification_config = api_request(base_url, "GET", "/notifications/config")
    assert_condition(notification_config["sse_ready"] is True, "notification config missing sse readiness")

    prefs = api_request(base_url, "GET", "/preferences", token=accounts[0].token)
    assert_condition("preferences" in prefs, "preferences endpoint missing payload")
    updated_prefs = api_request(
        base_url,
        "PUT",
        "/preferences",
        token=accounts[0].token,
        payload={
            "followed_topics": ["emergency", "traffic"],
            "alerts_enabled": True,
            "breaking_only": False,
            "alert_radius_m": 1000,
            "feed_radius_m": 10000,
            "city": "Delhi",
        },
    )
    assert_condition("emergency" in updated_prefs["preferences"]["followed_topics"], "preferences did not persist topics")

    overview = api_request(base_url, "GET", "/analytics/overview", token=accounts[0].token)
    credibility_distribution = api_request(
        base_url,
        "GET",
        "/analytics/credibility-distribution",
        token=accounts[0].token,
    )
    propagation_stats = api_request(base_url, "GET", "/analytics/propagation-stats", token=accounts[0].token)
    leaderboard = api_request(base_url, "GET", "/analytics/leaderboard", token=accounts[0].token)
    city_leaderboard = api_request(
        base_url,
        "GET",
        "/analytics/city-leaderboard",
        token=accounts[0].token,
        params={"city": "Delhi", "limit": 20},
    )
    metrics = api_request(base_url, "GET", "/observability/metrics", token=accounts[0].token)
    assert_condition(overview["total_accounts"] >= user_count, "analytics overview missing accounts")
    assert_condition(overview["total_posts"] >= user_count, "analytics overview missing posts")
    assert_condition(overview["total_votes"] >= vote_total, "analytics overview missing votes")
    assert_condition(overview["unread_alerts"] >= 0, "analytics overview missing unread alerts")
    assert_condition(credibility_distribution["total"] >= user_count, "credibility distribution missing posts")
    assert_condition(propagation_stats["total"] >= user_count, "propagation stats missing posts")
    assert_condition(len(leaderboard["users"]) >= min(user_count, 10), "leaderboard missing users")
    assert_condition(city_leaderboard["city"] == "Delhi", "city leaderboard city mismatch")
    assert_condition(len(city_leaderboard["users"]) >= 1, "city leaderboard missing users")
    assert_condition(metrics["status"] == "ok", "observability metrics status mismatch")

    alerts = api_request(base_url, "GET", "/alerts", token=accounts[1].token)
    assert_condition(alerts["unread_count"] >= 1, "nearby user did not receive hyperlocal alert")
    first_alert_id = alerts["alerts"][0]["alert_id"]
    mark_read = api_request(base_url, "PATCH", f"/alerts/{first_alert_id}/read", token=accounts[1].token)
    assert_condition(mark_read["alert"]["is_read"] is True, "mark alert read failed")
    mark_all = api_request(base_url, "PATCH", "/alerts/read-all", token=accounts[1].token)
    assert_condition(mark_all["unread_count"] == 0, "mark all alerts read failed")

    for index, account in enumerate(accounts):
        state = api_request(base_url, "GET", "/user/me/state", token=account.token)
        assert_condition(state["email"] == account.email, "profile email mismatch")
        assert_condition(state["post_count"] >= 1, "profile missing created post")
        assert_condition(state["vote_count"] >= user_count - 1, "profile missing votes")

        activity = api_request(base_url, "GET", "/user/me/activity", token=account.token)
        assert_condition(len(activity["posts"]) >= 1, "activity missing posts")
        assert_condition(len(activity["votes"]) >= min(8, user_count - 1), "activity missing votes")

        private_user_id = accounts[(index + 1) % user_count].user["user_id"]
        private_state = api_request(
            base_url,
            "GET",
            f"/user/{private_user_id}/state",
            token=account.token,
            expected_status=200 if account.user["role"] == "admin" else 403,
        )
        if account.user["role"] == "admin":
            assert_condition(private_state["user_id"] == private_user_id, "admin could not read profile")

    relogin = api_request(
        base_url,
        "POST",
        "/auth/login",
        payload={"email": accounts[0].email, "password": accounts[0].password},
    )
    persisted_feed = api_request(base_url, "GET", "/feed", token=relogin["access_token"])
    persisted_ids = {post["post_id"] for post in persisted_feed["posts"]}
    assert_condition(posts[0]["post_id"] in persisted_ids, "relogin feed did not include persisted post")

    return {
        "base_url": base_url,
        "users": user_count,
        "posts": len(posts),
        "votes": vote_total,
        "duplicate_vote_status": 409,
        "feed_posts_seen": len(feed_ids),
        "global_feed_posts_seen": len(global_feed["posts"]),
        "leaderboard_users_seen": len(leaderboard["users"]),
        "city_leaderboard_users_seen": len(city_leaderboard["users"]),
        "alert_unread_initial": alerts["unread_count"],
        "health": health,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify NCPS webapp user flows over HTTP.")
    parser.add_argument("--base-url", required=True, help="Backend or frontend origin serving /api routes.")
    parser.add_argument("--users", type=int, default=10, help="Number of users to create.")
    args = parser.parse_args()

    if args.users < 2:
        print("--users must be at least 2", file=sys.stderr)
        return 2

    try:
        summary = run_flow(args.base_url, args.users)
    except Exception as exc:
        print(f"FAILED: {exc}", file=sys.stderr)
        return 1

    print("NCPS webapp verification passed")
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
