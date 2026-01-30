"""API endpoints for managing main requirements."""

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from .services import RequirementService
from .models import (
    RequirementCreate,
    RequirementDto,
    RequirementUpdate,
    RequirementHistory,
)
from questionnaire.models import QuestionAnswer
from dependencies import get_requirement_service

router = APIRouter()


class QuestionRequest(BaseModel):
    """Request model for the answer endpoint."""

    question: str
    product_id: str


@router.post(
    "/",
    response_model=RequirementDto,
    status_code=status.HTTP_201_CREATED,
    tags=["requirements_main"],
)
async def create_main_requirement(
    requirement: RequirementCreate,
    service: RequirementService = Depends(get_requirement_service),
):
    """Create a new main requirement."""
    return await service.create_requirement(requirement)


@router.get(
    "/",
    response_model=list[RequirementDto],
    operation_id="list_requirements",
    tags=["requirements_main"],
)
def read_main_requirements(
    product_id: str,
    skip: int = 0,
    limit: int = 100,
    service: RequirementService = Depends(get_requirement_service),
):
    """Retrieve main requirements for a specific product with pagination."""
    return service.get_requirements(product_id, skip, limit)


@router.get("/types", response_model=list[str], tags=["requirements_main"])
def get_distinct_types(
    service: RequirementService = Depends(get_requirement_service),
):
    """Retrieve all distinct requirement types."""
    return service.get_distinct_requirement_types()


@router.get(
    "/key/{requirement_key}",
    response_model=RequirementDto,
    tags=["requirements_main"],
)
def read_main_requirement_by_key(
    requirement_key: str,
    service: RequirementService = Depends(get_requirement_service),
):
    """
    Retrieve a single main requirement by its requirement_key.

    The requirement_key is automatically scoped to the authenticated
    organization, so the same key in different organizations refers
    to different requirements.

    Example: GET /requirements/key/PROD-123
    """
    return service.get_requirement_by_key(requirement_key)


@router.get(
    "/{requirement_id}",
    response_model=RequirementDto,
    tags=["requirements_main"],
)
def read_main_requirement(
    requirement_id: str,
    service: RequirementService = Depends(get_requirement_service),
):
    """Retrieve a single main requirement by ID."""
    return service.get_requirement(requirement_id)


@router.get(
    "/{requirement_id}/history",
    response_model=list[RequirementHistory],
    tags=["requirements_main"],
)
def read_requirement_history(
    requirement_id: str,
    service: RequirementService = Depends(get_requirement_service),
):
    """Retrieve the history for a specific main requirement."""
    return service.get_requirement_history(requirement_id)


@router.put(
    "/{requirement_id}",
    response_model=RequirementDto,
    tags=["requirements_main"],
)
async def update_main_requirement(
    requirement_id: str,
    requirement: RequirementUpdate,
    service: RequirementService = Depends(get_requirement_service),
):
    """Update an existing main requirement by ID."""
    return await service.update_requirement(requirement_id, requirement)


@router.delete(
    "/{requirement_id}",
    response_model=RequirementDto,
    tags=["requirements_main"],
)
def delete_main_requirement(
    requirement_id: str,
    service: RequirementService = Depends(get_requirement_service),
):
    """Delete a main requirement by ID and return the deleted data."""
    return service.delete_requirement(requirement_id)


@router.post(
    "/answer",
    response_model=QuestionAnswer,
    operation_id="answer_requirements_question",
    tags=["requirements_main"],
)
async def answer_question_endpoint(
    request: QuestionRequest,
    service: RequirementService = Depends(get_requirement_service),
):
    """Answer a question based on relevant main requirements for a specific product."""
    return await service.answer_question(
        question=request.question,
        product_id=request.product_id,
    )
