"""Custom exceptions for async operations."""


class TaskNotFoundException(Exception):
    """Raised when a task is not found"""

    def __init__(self, task_id: str):
        self.task_id = task_id
        super().__init__(f"Task with ID {task_id} not found")


class TaskUpdateException(Exception):
    """Raised when task update fails"""

    pass


class TaskCancelledException(Exception):
    """Raised when a task has been cancelled"""

    def __init__(self, task_id: str):
        self.task_id = task_id
        super().__init__(f"Task {task_id} was cancelled")
