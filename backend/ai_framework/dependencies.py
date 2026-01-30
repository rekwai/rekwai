"""Dependency dataclasses for AI framework agents."""

from dataclasses import dataclass
from sqlalchemy.orm import Session
from s3_service import S3Service


@dataclass
class DatabaseDeps:
    """Dependencies for agents that need database access."""

    db: Session


@dataclass
class FileDeps:
    """Dependencies for agents that need file storage access."""

    s3_service: S3Service
