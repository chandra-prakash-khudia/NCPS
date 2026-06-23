#!/usr/bin/env python3
"""
Migrate legacy local post-image URLs to Cloudinary, or clear broken references.

Use after switching production to:
  NCPS_IMAGE_STORAGE=cloudinary
  CLOUDINARY_URL=cloudinary://...

Examples from backend/:
  PYTHONPATH=. python scripts/migrate_post_images_to_cloudinary.py
  PYTHONPATH=. python scripts/migrate_post_images_to_cloudinary.py --apply --clear-missing
"""

from __future__ import annotations

import argparse
import sys

from sqlalchemy import select

from app.models.post import Post
from webapp.db import get_session_factory, init_webapp_database
from webapp.media_storage import (
    image_storage_status,
    local_upload_filename_from_url,
    local_upload_media_type,
    local_upload_path,
    upload_post_image,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Move legacy /api/uploads post images to Cloudinary."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist changes. Without this flag the script only prints what it would do.",
    )
    parser.add_argument(
        "--clear-missing",
        action="store_true",
        help="Set image_url=NULL for local upload URLs whose files no longer exist.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of legacy image posts to inspect.",
    )
    args = parser.parse_args()

    storage = image_storage_status()
    print(
        "Image storage: "
        f"mode={storage['mode']} active={storage['active']} ready={storage['ready']}"
    )
    if storage.get("problem"):
        print(f"Storage problem: {storage['problem']}")

    init_webapp_database()
    session = get_session_factory()()
    counts = {
        "legacy_rows": 0,
        "would_upload": 0,
        "uploaded": 0,
        "missing": 0,
        "would_clear": 0,
        "cleared": 0,
        "invalid_local_url": 0,
    }

    try:
        query = (
            select(Post)
            .where(Post.image_url.like("/api/uploads/%"))
            .order_by(Post.created_at.asc())
        )
        if args.limit:
            query = query.limit(args.limit)

        for post in session.scalars(query):
            counts["legacy_rows"] += 1
            old_url = post.image_url
            filename = local_upload_filename_from_url(old_url)
            if filename is None:
                counts["invalid_local_url"] += 1
                continue

            path = local_upload_path(filename)
            if path.is_file():
                if storage["active"] != "cloudinary":
                    raise RuntimeError(
                        "A legacy local image file exists, but Cloudinary is not active. "
                        "Set NCPS_IMAGE_STORAGE=cloudinary and CLOUDINARY_URL before applying."
                    )
                if args.apply:
                    post.image_url = upload_post_image(
                        path.read_bytes(),
                        local_upload_media_type(filename),
                    )
                    counts["uploaded"] += 1
                    print(f"uploaded {post.post_id} -> {post.image_url}")
                else:
                    counts["would_upload"] += 1
                    print(f"would upload {post.post_id}: {path}")
                continue

            counts["missing"] += 1
            if args.clear_missing:
                if args.apply:
                    post.image_url = None
                    counts["cleared"] += 1
                    print(f"cleared missing image for {post.post_id}: {old_url}")
                else:
                    counts["would_clear"] += 1
                    print(f"would clear missing image for {post.post_id}: /api/uploads/{filename}")
            else:
                print(f"missing local file for {post.post_id}: /api/uploads/{filename}")

        if args.apply:
            session.commit()
        else:
            session.rollback()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    print("\nSummary")
    for key, value in counts.items():
        print(f"  {key}: {value}")

    if not args.apply:
        print("\nDry run only. Re-run with --apply to persist changes.")
    if counts["missing"] and not args.clear_missing:
        print("Missing files remain referenced. Re-run with --clear-missing to hide them.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
