import os
import tempfile
import uuid

import pytest
from fastapi.testclient import TestClient


_db_file = tempfile.NamedTemporaryFile(prefix="ncps-webapp-test-", suffix=".db", delete=False)
_db_file.close()

os.environ["NCPS_WEBAPP_DATABASE_URL"] = f"sqlite:///{_db_file.name}"
os.environ["NCPS_ALLOW_TEST_DATABASE"] = "1"
os.environ["NCPS_AUTO_CREATE_SCHEMA"] = "1"

from webapp import app
from webapp.db import dispose_webapp_database, init_webapp_database


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


def _register(client: TestClient, name: str = "Test User", password: str = "StrongPass123") -> dict:
    email = f"{uuid.uuid4()}@example.com"
    response = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert response.status_code == 200
    payload = response.json()
    payload["password"] = password
    return payload


def test_account_can_create_post_and_read_own_state(client):
    auth = _register(client)
    headers = {"Authorization": f"Bearer {auth['access_token']}"}

    created = client.post(
        "/api/post/create",
        headers=headers,
        json={
            "content": "Major traffic disruption near the main market entrance.",
            "lat": 28.6139,
            "lon": 77.2090,
        },
    )

    assert created.status_code == 200
    assert created.json()["user_id"] == auth["user"]["user_id"]

    state = client.get("/api/user/me/state", headers=headers)
    assert state.status_code == 200
    assert state.json()["email"] == auth["user"]["email"]
    assert state.json()["post_count"] >= 1


def test_login_survives_database_reinitialization(client):
    auth = _register(client, password="PersistPass123")
    email = auth["user"]["email"]

    dispose_webapp_database()
    init_webapp_database()

    login = client.post(
        "/api/auth/login",
        json={"email": email, "password": "PersistPass123"},
    )

    assert login.status_code == 200
    assert login.json()["user"]["email"] == email


def test_google_auth_creates_and_reuses_account(client):
    credential = "test-google|google-sub-1|google.user@example.com|Google User"
    first = client.post("/api/auth/google", json={"credential": credential})
    second = client.post("/api/auth/google", json={"credential": credential})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["user"]["email"] == "google.user@example.com"
    assert second.json()["user"]["user_id"] == first.json()["user"]["user_id"]
    assert second.json()["user"]["auth_provider"] == "google"


def test_protected_routes_require_bearer_token(client):
    response = client.post(
        "/api/post/create",
        json={"content": "This report has no authenticated owner."},
    )

    assert response.status_code == 401


def test_same_account_cannot_vote_twice_on_same_post(client):
    author = _register(client, "Author")
    voter = _register(client, "Voter")
    author_headers = {"Authorization": f"Bearer {author['access_token']}"}
    voter_headers = {"Authorization": f"Bearer {voter['access_token']}"}

    created = client.post(
        "/api/post/create",
        headers=author_headers,
        json={"content": "Water logging reported near the metro station."},
    )
    post_id = created.json()["post_id"]

    first_vote = client.post(
        "/api/post/vote",
        headers=voter_headers,
        json={"post_id": post_id, "vote": 1},
    )
    second_vote = client.post(
        "/api/post/vote",
        headers=voter_headers,
        json={"post_id": post_id, "vote": -1},
    )

    assert first_vote.status_code == 200
    assert second_vote.status_code == 409


def test_social_actions_explainability_and_category_feed(client):
    author = _register(client, "Category Author")
    voter = _register(client, "Category Voter")
    author_headers = {"Authorization": f"Bearer {author['access_token']}"}
    voter_headers = {"Authorization": f"Bearer {voter['access_token']}"}

    created = client.post(
        "/api/post/create",
        headers=author_headers,
        json={
            "content": "Traffic accident blocking the main flyover near city center.",
            "category": "traffic",
            "lat": 28.61,
            "lon": 77.21,
        },
    )
    assert created.status_code == 200
    post_id = created.json()["post_id"]
    assert created.json()["category"] == "traffic"

    filtered = client.get("/api/feed", headers=voter_headers, params={"category": "traffic"})
    assert filtered.status_code == 200
    assert any(item["post_id"] == post_id and item["category"] == "traffic" for item in filtered.json()["posts"])

    share = client.post(f"/api/post/{post_id}/share", headers=voter_headers)
    bookmark = client.post(f"/api/post/{post_id}/bookmark", headers=voter_headers)
    report = client.post(
        f"/api/post/{post_id}/report",
        headers=voter_headers,
        json={"reason": "misinformation", "description": "Needs a second source."},
    )
    duplicate_report = client.post(
        f"/api/post/{post_id}/report",
        headers=voter_headers,
        json={"reason": "misinformation"},
    )

    assert share.status_code == 200
    assert share.json()["shares_count"] == 1
    assert bookmark.status_code == 200
    assert bookmark.json()["bookmarked"] is True
    assert report.status_code == 200
    assert report.json()["reports_count"] == 1
    assert duplicate_report.status_code == 409

    detail = client.get(f"/api/post/{post_id}", headers=voter_headers)
    assert detail.status_code == 200
    assert detail.json()["is_bookmarked"] is True
    assert detail.json()["shares_count"] == 1
    assert detail.json()["reports_count"] == 1
    assert detail.json()["why_shown"]

    explanation = client.get(f"/api/post/{post_id}/explain", headers=voter_headers)
    assert explanation.status_code == 200
    assert explanation.json()["summary"]["category"] == "traffic"
    assert "decision_trace" in explanation.json()


def test_hyperlocal_alerts_and_city_leaderboard(client):
    author = _register(client, "Alert Author")
    nearby = _register(client, "Nearby User")
    far = _register(client, "Far User")
    author_headers = {"Authorization": f"Bearer {author['access_token']}"}
    nearby_headers = {"Authorization": f"Bearer {nearby['access_token']}"}
    far_headers = {"Authorization": f"Bearer {far['access_token']}"}

    client.post("/api/user/location", headers=author_headers, json={"lat": 28.6100, "lon": 77.2100, "city": "Delhi"})
    client.post("/api/user/location", headers=nearby_headers, json={"lat": 28.6105, "lon": 77.2105, "city": "Delhi"})
    client.post("/api/user/location", headers=far_headers, json={"lat": 29.0, "lon": 78.0, "city": "Meerut"})

    created = client.post(
        "/api/post/create",
        headers=author_headers,
        json={
            "content": "Urgent fire emergency reported near the community hall.",
            "category": "emergency",
            "lat": 28.6102,
            "lon": 77.2102,
        },
    )
    assert created.status_code == 200
    assert created.json()["alerts_created"] >= 1

    nearby_alerts = client.get("/api/alerts", headers=nearby_headers)
    far_alerts = client.get("/api/alerts", headers=far_headers)
    assert nearby_alerts.status_code == 200
    assert nearby_alerts.json()["unread_count"] >= 1
    assert any(item["distance_m"] <= 1000 for item in nearby_alerts.json()["alerts"])
    assert far_alerts.status_code == 200
    assert far_alerts.json()["unread_count"] == 0

    alert_id = nearby_alerts.json()["alerts"][0]["alert_id"]
    read = client.patch(f"/api/alerts/{alert_id}/read", headers=nearby_headers)
    assert read.status_code == 200
    assert read.json()["alert"]["is_read"] is True

    city = client.get("/api/analytics/city-leaderboard", headers=nearby_headers, params={"city": "Delhi"})
    assert city.status_code == 200
    assert city.json()["city"] == "Delhi"
    assert any(item["city"] == "Delhi" for item in city.json()["users"])


def test_feed_and_activity_return_persisted_records(client):
    auth = _register(client, "Reporter")
    headers = {"Authorization": f"Bearer {auth['access_token']}"}
    created = client.post(
        "/api/post/create",
        headers=headers,
        json={"content": "Emergency road closure near central park.", "lat": 28.6, "lon": 77.2},
    )
    assert created.status_code == 200

    feed = client.get("/api/feed", headers=headers)
    activity = client.get("/api/user/me/activity", headers=headers)

    assert feed.status_code == 200
    assert any(item["post_id"] == created.json()["post_id"] for item in feed.json()["posts"])
    assert activity.status_code == 200
    assert any(item["post_id"] == created.json()["post_id"] for item in activity.json()["posts"])


def test_startup_fails_when_database_is_not_postgresql_and_not_test(monkeypatch):
    monkeypatch.setenv("NCPS_WEBAPP_DATABASE_URL", "sqlite:////tmp/ncps-not-production.db")
    monkeypatch.delenv("NCPS_ALLOW_TEST_DATABASE", raising=False)
    monkeypatch.delenv("NCPS_AUTO_CREATE_SCHEMA", raising=False)
    dispose_webapp_database()

    with pytest.raises(RuntimeError, match="NCPS webapp database startup failed"):
        init_webapp_database()

    monkeypatch.setenv("NCPS_WEBAPP_DATABASE_URL", f"sqlite:///{_db_file.name}")
    monkeypatch.setenv("NCPS_ALLOW_TEST_DATABASE", "1")
    monkeypatch.setenv("NCPS_AUTO_CREATE_SCHEMA", "1")
    dispose_webapp_database()


def test_full_webapp_flow_with_ten_users(client):
    accounts = []

    for index in range(10):
        password = f"StrongPass{index}23"
        registered = _register(client, name=f"Flow User {index + 1}", password=password)
        email = registered["user"]["email"]

        login = client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )
        assert login.status_code == 200
        assert login.json()["user"]["email"] == email

        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        account = {
            "email": email,
            "password": password,
            "token": token,
            "headers": headers,
            "user": login.json()["user"],
        }
        accounts.append(account)

        location = client.post(
            "/api/user/location",
            headers=headers,
            json={"lat": 28.60 + (index * 0.01), "lon": 77.20 + (index * 0.01)},
        )
        assert location.status_code == 200
        assert location.json()["location_confidence"] > 0.5

    assert len({account["user"]["user_id"] for account in accounts}) == 10

    posts = []
    for index, account in enumerate(accounts):
        created = client.post(
            "/api/post/create",
            headers=account["headers"],
            json={
                "content": f"Integration test local news report {index + 1}: verified road update near sector {index + 1}.",
                "lat": 28.60 + (index * 0.01),
                "lon": 77.20 + (index * 0.01),
            },
        )
        assert created.status_code == 200
        payload = created.json()
        assert payload["user_id"] == account["user"]["user_id"]
        assert payload["credibility"] == 0.5
        posts.append(payload)

    for post_index, post in enumerate(posts):
        for voter_index, account in enumerate(accounts):
            if voter_index == post_index:
                continue
            vote_value = 1 if voter_index % 3 != 0 else -1
            vote = client.post(
                "/api/post/vote",
                headers=account["headers"],
                json={"post_id": post["post_id"], "vote": vote_value},
            )
            assert vote.status_code == 200
            assert vote.json()["post_id"] == post["post_id"]
            assert 0.0 <= vote.json()["updated_credibility"] <= 1.0

    duplicate_vote = client.post(
        "/api/post/vote",
        headers=accounts[1]["headers"],
        json={"post_id": posts[0]["post_id"], "vote": 1},
    )
    assert duplicate_vote.status_code == 409

    feed = client.get(
        "/api/feed",
        headers=accounts[0]["headers"],
        params={"lat": 28.61, "lon": 77.21, "limit": 20},
    )
    assert feed.status_code == 200
    feed_payload = feed.json()
    assert feed_payload["total"] >= 10
    feed_post_ids = {item["post_id"] for item in feed_payload["posts"]}
    assert {post["post_id"] for post in posts}.issubset(feed_post_ids)

    global_feed = client.get(
        "/api/feed",
        headers=accounts[0]["headers"],
        params={"mode": "global", "limit": 20},
    )
    assert global_feed.status_code == 200
    assert global_feed.json()["total"] >= 10

    post_detail = client.get(f"/api/post/{posts[0]['post_id']}", headers=accounts[1]["headers"])
    assert post_detail.status_code == 200
    detail_payload = post_detail.json()
    assert detail_payload["vote_count"] == 9
    assert detail_payload["user_vote"] in (-1, 1)
    assert detail_payload["can_vote"] is False
    assert 0.0 <= detail_payload["credibility"] <= 1.0
    assert detail_payload["n_effective"] > 0

    overview = client.get("/api/analytics/overview", headers=accounts[0]["headers"])
    credibility_distribution = client.get(
        "/api/analytics/credibility-distribution",
        headers=accounts[0]["headers"],
    )
    propagation_stats = client.get("/api/analytics/propagation-stats", headers=accounts[0]["headers"])
    leaderboard = client.get("/api/analytics/leaderboard", headers=accounts[0]["headers"])

    assert overview.status_code == 200
    assert overview.json()["total_accounts"] >= 10
    assert overview.json()["total_posts"] >= 10
    assert overview.json()["total_votes"] >= 90
    assert overview.json()["active_voters"] >= 10
    assert credibility_distribution.status_code == 200
    assert credibility_distribution.json()["total"] >= 10
    assert sum(item["count"] for item in credibility_distribution.json()["buckets"]) >= 10
    assert propagation_stats.status_code == 200
    assert propagation_stats.json()["total"] >= 10
    assert sum(item["count"] for item in propagation_stats.json()["tiers"]) >= 10
    assert leaderboard.status_code == 200
    assert len(leaderboard.json()["users"]) >= 10
    assert leaderboard.json()["users"][0]["badge"]["label"]

    for index, account in enumerate(accounts):
        state = client.get("/api/user/me/state", headers=account["headers"])
        assert state.status_code == 200
        state_payload = state.json()
        assert state_payload["email"] == account["email"]
        assert state_payload["post_count"] >= 1
        assert state_payload["vote_count"] >= 9
        assert 0.0 <= state_payload["weight"] <= 1.0

        activity = client.get("/api/user/me/activity", headers=account["headers"])
        assert activity.status_code == 200
        activity_payload = activity.json()
        assert len(activity_payload["posts"]) >= 1
        assert len(activity_payload["votes"]) >= 8

        private_state = client.get(
            f"/api/user/{accounts[(index + 1) % 10]['user']['user_id']}/state",
            headers=account["headers"],
        )
        if account["user"]["role"] != "admin":
            assert private_state.status_code == 403

    dispose_webapp_database()
    init_webapp_database()

    relogin = client.post(
        "/api/auth/login",
        json={"email": accounts[0]["email"], "password": accounts[0]["password"]},
    )
    assert relogin.status_code == 200
    relogin_headers = {"Authorization": f"Bearer {relogin.json()['access_token']}"}

    persisted_feed = client.get("/api/feed", headers=relogin_headers)
    assert persisted_feed.status_code == 200
    persisted_post_ids = {item["post_id"] for item in persisted_feed.json()["posts"]}
    assert posts[0]["post_id"] in persisted_post_ids
