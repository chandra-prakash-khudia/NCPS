"""
Database wiring for the user-facing webapp.

This module deliberately fails when no database is available. SQLite is only
allowed when explicitly enabled for automated tests.
"""

from __future__ import annotations

import os
from collections.abc import Iterator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import config
from app.database.connection import Base
from app import models as _app_models  # noqa: F401 - registers Base metadata
from webapp import models as _webapp_models  # noqa: F401 - registers Base metadata


REQUIRED_TABLES = {
    "auth_accounts",
    "users",
    "posts",
    "interactions",
    "user_locations",
    "alerts",
    "user_preferences",
    "bookmarks",
    "content_reports",
    "web_push_subscriptions",
    "observability_events",
    "user_request_metadata",
}

_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def get_database_url() -> str:
    """Return the sync SQLAlchemy URL used by the webapp."""
    raw_url = (
        os.getenv("NCPS_WEBAPP_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or config.database_url
    )
    if raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
    if raw_url.startswith("postgresql+asyncpg://"):
        return raw_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    return raw_url


def get_database_kind() -> str:
    """Return a short database type for diagnostics."""
    database_url = get_database_url()
    if database_url.startswith("postgresql"):
        return "postgresql"
    if database_url.startswith("sqlite"):
        return "sqlite"
    return database_url.split(":", 1)[0] or "unknown"


def is_test_database_allowed() -> bool:
    return os.getenv("NCPS_ALLOW_TEST_DATABASE") == "1"


def should_auto_create_schema() -> bool:
    return os.getenv("NCPS_AUTO_CREATE_SCHEMA") == "1"


def get_engine() -> Engine:
    global _engine, _session_factory

    if _engine is None:
        database_url = get_database_url()
        if not database_url.startswith("postgresql") and not is_test_database_allowed():
            raise RuntimeError(
                "NCPS webapp requires PostgreSQL. Set NCPS_WEBAPP_DATABASE_URL "
                "or NCPS_DATABASE_URL to a PostgreSQL database URL."
            )

        connect_args = {}
        if database_url.startswith("sqlite"):
            connect_args = {"check_same_thread": False}

        _engine = create_engine(
            database_url,
            pool_pre_ping=True,
            future=True,
            connect_args=connect_args,
        )
        _session_factory = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)

    return _engine


def get_session_factory() -> sessionmaker[Session]:
    if _session_factory is None:
        get_engine()
    assert _session_factory is not None
    return _session_factory


def get_db() -> Iterator[Session]:
    """FastAPI dependency that commits or rolls back one DB session."""
    session = get_session_factory()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_webapp_database() -> None:
    """Validate database connectivity and schema before serving traffic."""
    try:
        engine = get_engine()
        with engine.begin() as conn:
            conn.execute(text("SELECT 1"))
            if should_auto_create_schema():
                Base.metadata.create_all(bind=conn)
            else:
                existing = set(inspect(conn).get_table_names())
                missing = sorted(REQUIRED_TABLES - existing)
                if missing:
                    raise RuntimeError(
                        "NCPS webapp database schema is missing tables: {}. "
                        "Run `alembic upgrade head` from the backend directory.".format(
                            ", ".join(missing)
                        )
                    )
    except Exception as exc:
        raise RuntimeError(
            "NCPS webapp database startup failed. Verify PostgreSQL is running, "
            "NCPS_WEBAPP_DATABASE_URL/NCPS_DATABASE_URL is correct, and migrations are applied."
        ) from exc


def dispose_webapp_database() -> None:
    global _engine, _session_factory

    if _engine is not None:
        _engine.dispose()
    _engine = None
    _session_factory = None
