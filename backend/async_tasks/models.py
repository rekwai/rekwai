"""Pydantic models for async task API requests and responses."""

from pydantic import BaseModel
from datetime import datetime

from .services import TaskStatus, TaskType


class TaskResponse(BaseModel):
    """Response model for task information."""

    id: str
    name: str
    type: TaskType
    status: TaskStatus
    progress: float
    message: str
    error: str
    created_at: datetime
    updated_at: datetime
    entity_id: str = ""


class TaskCreateResponse(BaseModel):
    """Response model for task creation."""

    task_id: str
