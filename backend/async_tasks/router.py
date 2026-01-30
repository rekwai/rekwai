"""FastAPI router for async task status endpoints."""

import logging
from fastapi import APIRouter, HTTPException, Depends, status

from .models import TaskResponse
from .services import AsyncTasksService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/async-tasks",
    tags=["async-tasks"],
)


def get_async_tasks_service() -> AsyncTasksService:
    """Local function to get AsyncTasksService from dependencies to avoid circular imports."""
    from dependencies import get_async_tasks_service as deps_get_async_tasks_service

    return deps_get_async_tasks_service()


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task_status(
    task_id: str, async_tasks: AsyncTasksService = Depends(get_async_tasks_service)
):
    """Get the status of an async task by ID."""
    logger.debug(f"Getting status for task {task_id}")

    task_info = async_tasks.get_task(task_id)
    if task_info is None:
        logger.warning(f"Task {task_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    return TaskResponse.model_validate(task_info, from_attributes=True)


@router.post("/{task_id}/cancel", response_model=TaskResponse)
async def cancel_task(
    task_id: str,
    cleanup: bool = True,
    async_tasks: AsyncTasksService = Depends(get_async_tasks_service),
):
    """
    Cancel a running async task.

    Args:
        task_id: The task ID to cancel
        cleanup: Whether to cleanup partial data (default True).
                 Set to False to keep already-created data (documents, requirements, questions).
    """
    logger.info(f"Cancel request for task {task_id} (cleanup={cleanup})")

    task_info = async_tasks.get_task(task_id)
    if task_info is None:
        logger.warning(f"Task {task_id} not found for cancellation")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    success = async_tasks.request_cancellation(task_id, cleanup=cleanup)
    if not success:
        logger.warning(
            f"Task {task_id} cannot be cancelled (status: {task_info.status})"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task cannot be cancelled (already {task_info.status.value})",
        )

    # Get updated task info
    task_info = async_tasks.get_task(task_id)
    return TaskResponse.model_validate(task_info, from_attributes=True)
