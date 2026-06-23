"""Media upload policy for the production webapp."""

from __future__ import annotations

import io
import os
import re
import uuid
from pathlib import Path


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024
LOCAL_UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
LOCAL_UPLOAD_RE = re.compile(r"[a-f0-9]{32}\.(jpg|png|webp|gif)")


class MediaStorageValidationError(ValueError):
    """Raised when an uploaded media file or URL is invalid."""


class MediaStorageUnavailableError(RuntimeError):
    """Raised when the configured durable media backend is unavailable."""


def get_image_storage_mode() -> str:
    """Return the configured image backend: cloudinary, local, or auto."""
    mode = os.getenv("NCPS_IMAGE_STORAGE", "auto").strip().lower()
    return mode if mode in {"cloudinary", "local", "auto"} else "auto"


def is_cloudinary_configured() -> bool:
    return bool(os.getenv("CLOUDINARY_URL", "").strip())


def _cloudinary_uploader():
    if not is_cloudinary_configured():
        raise MediaStorageUnavailableError(
            "Cloudinary image storage is required, but CLOUDINARY_URL is not configured."
        )
    try:
        import cloudinary
        import cloudinary.uploader
    except ImportError as exc:
        raise MediaStorageUnavailableError(
            "Cloudinary image storage is required, but the cloudinary package is not installed."
        ) from exc

    cloudinary.config(cloudinary_url=os.getenv("CLOUDINARY_URL"))
    return cloudinary.uploader


def _save_local_image(data: bytes, content_type: str) -> str:
    LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }[content_type]
    filename = f"{uuid.uuid4().hex}{ext}"
    (LOCAL_UPLOAD_DIR / filename).write_bytes(data)
    return f"/api/uploads/{filename}"


def _upload_cloudinary_image(data: bytes) -> str:
    uploader = _cloudinary_uploader()
    try:
        result = uploader.upload(
            io.BytesIO(data),
            folder="ncps/posts",
            resource_type="image",
        )
    except Exception as exc:
        raise MediaStorageUnavailableError(
            "Cloudinary upload failed. Check CLOUDINARY_URL and Cloudinary account limits."
        ) from exc

    secure_url = result.get("secure_url")
    if not secure_url:
        raise MediaStorageUnavailableError("Cloudinary upload did not return a secure URL.")
    return str(secure_url)


def upload_post_image(data: bytes, content_type: str) -> str:
    """Store an uploaded post image and return the public image URL."""
    content_type = (content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise MediaStorageValidationError("Image must be JPEG, PNG, WebP, or GIF.")
    if len(data) > MAX_IMAGE_BYTES:
        raise MediaStorageValidationError("Image must be 5 MB or smaller.")

    mode = get_image_storage_mode()
    if mode == "cloudinary":
        return _upload_cloudinary_image(data)
    if mode == "local":
        return _save_local_image(data, content_type)

    if is_cloudinary_configured():
        return _upload_cloudinary_image(data)
    return _save_local_image(data, content_type)


def local_upload_filename_from_url(url: str | None) -> str | None:
    if not url or not url.startswith("/api/uploads/"):
        return None
    filename = url.rsplit("/", 1)[-1]
    return filename if LOCAL_UPLOAD_RE.fullmatch(filename) else None


def local_upload_path(filename: str) -> Path:
    return LOCAL_UPLOAD_DIR / filename


def is_local_upload_url(url: str | None) -> bool:
    return local_upload_filename_from_url(url) is not None


def local_upload_exists(url: str | None) -> bool:
    filename = local_upload_filename_from_url(url)
    return bool(filename and local_upload_path(filename).is_file())


def public_post_image_url(url: str | None) -> str | None:
    """Return a safe public image URL, hiding missing local upload references."""
    if not url:
        return None
    if is_local_upload_url(url):
        return url if local_upload_exists(url) else None
    return url


def is_post_image_url_allowed(url: str | None) -> bool:
    """Validate post image URLs against the active storage policy."""
    if not url:
        return True
    if url.startswith(("http://", "https://")):
        return True
    if is_local_upload_url(url):
        return get_image_storage_mode() != "cloudinary"
    return False


def local_upload_media_type(filename: str) -> str:
    suffix = Path(filename).suffix
    return {
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }[suffix]


def image_storage_status() -> dict:
    """Return non-secret media backend diagnostics for health checks."""
    mode = get_image_storage_mode()
    cloudinary_configured = is_cloudinary_configured()
    cloudinary_importable = False
    problem = None

    if mode == "cloudinary" or cloudinary_configured:
        try:
            _cloudinary_uploader()
            cloudinary_importable = True
        except MediaStorageUnavailableError as exc:
            problem = str(exc)

    if mode == "cloudinary":
        ready = cloudinary_configured and cloudinary_importable
        active = "cloudinary" if ready else "unavailable"
    elif mode == "local":
        ready = True
        active = "local"
    elif cloudinary_configured:
        ready = cloudinary_importable
        active = "cloudinary" if cloudinary_importable else "unavailable"
    else:
        ready = True
        active = "local"

    return {
        "mode": mode,
        "active": active,
        "ready": ready,
        "cloudinary_configured": cloudinary_configured,
        "max_image_mb": MAX_IMAGE_BYTES // (1024 * 1024),
        "problem": problem,
    }
