from contextvars import ContextVar
from typing import Optional

org_id_context: ContextVar[Optional[str]] = ContextVar("org_id", default=None)


def get_organization_id() -> str:
    """
    Get the organization ID from the current context.

    Returns:
        str: The organization ID

    Raises:
        RuntimeError: If no organization ID is set in the context
    """
    org_id = org_id_context.get()
    if org_id is None:
        raise RuntimeError("Organization ID is not set in the current context")
    return org_id


def set_organization_id(org_id: str) -> None:
    org_id_context.set(org_id)
