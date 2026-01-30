"""AsyncTasksService for managing background tasks."""

import asyncio
import logging
import threading
import uuid6
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, Optional
from dataclasses import dataclass

from .exceptions import TaskNotFoundException, TaskCancelledException

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskType(str, Enum):
    EXTRACT_REQUIREMENTS = "extract_requirements"
    EXTRACT_QUESTIONS = "extract_questions"


@dataclass
class TaskInfo:
    id: str
    name: str
    type: TaskType
    status: TaskStatus
    progress: float  # 0.0 to 1.0
    message: str
    error: str
    created_at: datetime
    updated_at: datetime
    entity_id: str = ""


class AsyncTasksService:
    """Thread-safe task management service.

    Manages background task lifecycle including creation, progress tracking,
    cancellation, and cleanup of completed tasks.
    """

    def __init__(self):
        self._tasks: Dict[str, TaskInfo] = {}
        # Maps task_id -> should_cleanup_on_cancel (True = delete partial data, False = keep it)
        self._cancellation_requests: Dict[str, bool] = {}
        self._lock = threading.Lock()
        self._cleanup_task = None
        self._start_cleanup_task()

    def _start_cleanup_task(self):
        """Start the periodic cleanup task."""

        async def cleanup_loop():
            while True:
                try:
                    await asyncio.sleep(3600)  # Wait 1 hour
                    self._cleanup_old_tasks()
                except Exception as e:
                    logger.error(f"Error in cleanup task: {e}")

        # Start the cleanup task in the background
        try:
            loop = asyncio.get_event_loop()
            self._cleanup_task = loop.create_task(cleanup_loop())
        except RuntimeError:
            # No event loop running, cleanup will be handled manually
            logger.warning("No event loop running, automatic cleanup disabled")

    def _cleanup_old_tasks(self):
        """Clean up tasks that are finished and older than 24 hours."""
        cutoff_time = datetime.now() - timedelta(hours=24)

        with self._lock:
            tasks_to_remove = [
                task_id
                for task_id, task_info in self._tasks.items()
                if task_info.status
                in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]
                and task_info.updated_at < cutoff_time
            ]

            for task_id in tasks_to_remove:
                del self._tasks[task_id]
                self._cancellation_requests.pop(task_id, None)

        if tasks_to_remove:
            logger.info(f"Cleaned up old tasks: {tasks_to_remove}")

    def create_task(self, name: str, task_type: TaskType) -> str:
        """Create a new task and return its ID."""
        task_id = str(uuid6.uuid7())  # using time-ordered uuid7
        now = datetime.now()

        task_info = TaskInfo(
            id=task_id,
            name=name,
            type=task_type,
            status=TaskStatus.PENDING,
            progress=0.0,
            message="",
            error="",
            created_at=now,
            updated_at=now,
        )

        with self._lock:
            self._tasks[task_id] = task_info

        logger.info(f"Created task {task_id}")
        return task_id

    def get_task(self, task_id: str) -> Optional[TaskInfo]:
        """Get task information by ID."""
        with self._lock:
            return self._tasks.get(task_id)

    def update_task(
        self,
        task_id: str,
        status: Optional[TaskStatus] = None,
        progress: Optional[float] = None,
        message: Optional[str] = None,
        error: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> bool:
        """Update task information."""
        with self._lock:
            if task_id not in self._tasks:
                raise TaskNotFoundException(task_id)

            task_info = self._tasks[task_id]

            if status is not None:
                task_info.status = status
            if progress is not None:
                task_info.progress = max(
                    0.0, min(1.0, progress)
                )  # Clamp between 0 and 1
            if message is not None:
                task_info.message = message
            if error is not None:
                task_info.error = error
            if entity_id is not None:
                task_info.entity_id = entity_id

            task_info.updated_at = datetime.now()

            logger.debug(
                f"Updated task {task_id}: status={status}, progress={progress}, message={message}"
            )
            return True

    def request_cancellation(self, task_id: str, cleanup: bool = True) -> bool:
        """
        Request cancellation of a task.

        Args:
            task_id: The task ID to cancel
            cleanup: Whether to cleanup partial data (default True)

        Returns:
            True if cancellation was requested successfully, False if task cannot be cancelled
        """
        with self._lock:
            if task_id not in self._tasks:
                raise TaskNotFoundException(task_id)

            task_info = self._tasks[task_id]

            # Can only cancel pending or running tasks
            if task_info.status not in [TaskStatus.PENDING, TaskStatus.RUNNING]:
                return False

            # Mark as cancelled
            task_info.status = TaskStatus.CANCELLED
            task_info.message = "Cancellation requested"
            task_info.updated_at = datetime.now()

            # Track cancellation request with cleanup preference
            self._cancellation_requests[task_id] = cleanup

        logger.info(f"Cancellation requested for task {task_id} (cleanup={cleanup})")
        return True

    def is_cancellation_requested(self, task_id: str) -> bool:
        """Check if cancellation was requested for a task."""
        with self._lock:
            return task_id in self._cancellation_requests

    def should_cleanup_on_cancel(self, task_id: str) -> bool:
        """Get the cleanup preference for a cancelled task."""
        with self._lock:
            return self._cancellation_requests.get(task_id, True)

    def check_cancellation(self, task_id: str) -> None:
        """
        Check if cancellation was requested and raise exception if so.
        Background tasks should call this at safe checkpoints.

        Raises:
            TaskCancelledException: If cancellation was requested
        """
        if self.is_cancellation_requested(task_id):
            raise TaskCancelledException(task_id)

    def clear_cancellation_request(self, task_id: str) -> None:
        """Clear the cancellation request for a task (called after cleanup is complete)."""
        with self._lock:
            self._cancellation_requests.pop(task_id, None)

    def finalize_cancellation(
        self, task_id: str, message: str = "Task cancelled"
    ) -> None:
        """
        Finalize a task cancellation by updating status and clearing the request.
        Call this after cleanup is complete in TaskCancelledException handlers.

        Args:
            task_id: The task ID to finalize
            message: Custom message to set on the cancelled task
        """
        self.update_task(
            task_id,
            status=TaskStatus.CANCELLED,
            message=message,
        )
        self.clear_cancellation_request(task_id)

    def should_cleanup_cancelled_task(
        self, task_id: str, extraction_complete: bool
    ) -> bool:
        """
        Determine whether a cancelled task should have its partial data cleaned up.

        This is a helper for TaskCancelledException handlers to decide if cleanup
        should be performed before calling finalize_cancellation.

        Args:
            task_id: The task ID that was cancelled
            extraction_complete: Whether the core extraction was completed before cancellation

        Returns:
            True if partial data should be cleaned up, False otherwise
        """
        # Don't cleanup if extraction already completed - data is valuable
        if extraction_complete:
            return False
        # Check if user requested cleanup (default is True)
        return self.should_cleanup_on_cancel(task_id)
