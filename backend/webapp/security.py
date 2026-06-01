"""
Authentication helpers for the user-facing NCPS webapp.

Uses standard-library password hashing and signed bearer tokens so the
demo server can run without adding new infrastructure dependencies.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


TOKEN_TTL_SECONDS = int(os.getenv("NCPS_ACCESS_TOKEN_TTL_SECONDS", "28800"))
PASSWORD_ITERATIONS = int(os.getenv("NCPS_PASSWORD_ITERATIONS", "260000"))


class AuthError(ValueError):
    """Raised when token or password verification fails."""


class GoogleAuthError(ValueError):
    """Raised when a Google ID token cannot be verified."""


def hash_password(password: str) -> str:
    """Hash a password with PBKDF2-SHA256 and a unique salt."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_ITERATIONS,
    )
    return "pbkdf2_sha256${}${}${}".format(
        PASSWORD_ITERATIONS,
        _b64url_encode(salt),
        _b64url_encode(digest),
    )


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against a stored PBKDF2-SHA256 hash."""
    try:
        algorithm, iterations_raw, salt_raw, digest_raw = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_raw)
        salt = _b64url_decode(salt_raw)
        expected = _b64url_decode(digest_raw)
    except (TypeError, ValueError):
        return False

    actual = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(actual, expected)


def create_access_token(
    user_id: str,
    role: str,
    *,
    expires_in: int = TOKEN_TTL_SECONDS,
) -> str:
    """Create a compact HMAC-signed bearer token."""
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "role": role,
        "iat": now,
        "exp": now + expires_in,
    }
    signing_input = "{}.{}".format(
        _json_b64(header),
        _json_b64(payload),
    )
    signature = hmac.new(
        _auth_secret(),
        signing_input.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return "{}.{}".format(signing_input, _b64url_encode(signature))


def verify_access_token(token: str) -> dict[str, Any]:
    """Verify a bearer token and return its payload."""
    try:
        header_raw, payload_raw, signature_raw = token.split(".", 2)
    except ValueError as exc:
        raise AuthError("Malformed token") from exc

    signing_input = "{}.{}".format(header_raw, payload_raw)
    expected_sig = hmac.new(
        _auth_secret(),
        signing_input.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    supplied_sig = _b64url_decode(signature_raw)
    if not hmac.compare_digest(expected_sig, supplied_sig):
        raise AuthError("Invalid token signature")

    try:
        header = json.loads(_b64url_decode(header_raw))
        payload = json.loads(_b64url_decode(payload_raw))
    except (json.JSONDecodeError, ValueError) as exc:
        raise AuthError("Invalid token payload") from exc

    if header.get("alg") != "HS256":
        raise AuthError("Unsupported token algorithm")

    expires_at = int(payload.get("exp", 0))
    if expires_at < int(time.time()):
        raise AuthError("Token expired")

    if not payload.get("sub"):
        raise AuthError("Token missing subject")

    return payload


def verify_google_id_token(id_token: str, client_id: str | None = None) -> dict[str, Any]:
    """Verify a Google Identity Services ID token.

    Tests may use `test-google|sub|email|name` tokens when the test database
    flag is enabled. Production verification uses Google's tokeninfo endpoint
    to avoid adding a heavyweight dependency to the webapp server.
    """
    token = (id_token or "").strip()
    expected_audience = client_id or os.getenv("NCPS_GOOGLE_CLIENT_ID")
    if not token:
        raise GoogleAuthError("Missing Google credential")

    if os.getenv("NCPS_ALLOW_TEST_DATABASE") == "1" and token.startswith("test-google|"):
        try:
            _, subject, email, name = token.split("|", 3)
        except ValueError as exc:
            raise GoogleAuthError("Malformed test Google token") from exc
        return {
            "sub": subject,
            "email": email.lower(),
            "email_verified": True,
            "name": name,
            "picture": None,
            "aud": expected_audience or "test-client",
        }

    if not expected_audience:
        raise GoogleAuthError("Google sign-in is not configured")

    url = "https://oauth2.googleapis.com/tokeninfo?{}".format(
        urllib.parse.urlencode({"id_token": token})
    )
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        try:
            error_payload = json.loads(detail)
            message = error_payload.get("error_description") or error_payload.get("error")
        except json.JSONDecodeError:
            message = detail.strip() or exc.reason
        raise GoogleAuthError(f"Google token verification failed: {message}") from exc
    except Exception as exc:
        raise GoogleAuthError(f"Google token verification failed: {exc}") from exc

    if payload.get("error"):
        raise GoogleAuthError(
            payload.get("error_description") or payload.get("error") or "Invalid Google token"
        )

    if payload.get("aud") != expected_audience:
        raise GoogleAuthError(
            "Google token audience mismatch. Check NCPS_GOOGLE_CLIENT_ID matches VITE_GOOGLE_CLIENT_ID."
        )
    if str(payload.get("email_verified", "")).lower() not in {"true", "1"}:
        raise GoogleAuthError("Google account email is not verified")
    if not payload.get("sub") or not payload.get("email"):
        raise GoogleAuthError("Google token missing account identity")

    return payload


def _auth_secret() -> bytes:
    secret = os.getenv("NCPS_AUTH_SECRET")
    if not secret:
        secret = "ncps-local-dev-secret-change-me"
    return secret.encode("utf-8")


def _json_b64(value: dict[str, Any]) -> str:
    raw = json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return _b64url_encode(raw)


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))
