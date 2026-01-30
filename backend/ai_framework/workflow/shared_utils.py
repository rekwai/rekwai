"""Shared utilities for extraction workflows.

This module provides common utilities used across multiple extraction workflows
(requirements, questions, etc.) to avoid duplication.
"""

from contextlib import contextmanager

from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker


@contextmanager
def create_db_session(engine: Engine):
    """Create a database session with automatic cleanup.

    This context manager ensures proper session lifecycle management,
    preventing session leaks and ensuring connections are returned to the pool.

    Args:
        engine: SQLAlchemy engine to create session from

    Yields:
        Session: A database session ready for use

    Example:
        with create_db_session(ctx.deps.db_engine) as db:
            repo = SomeRepository(db)
            data = repo.get_something()
    """
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
