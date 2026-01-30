"""API endpoints for managing question links."""

from typing import List

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from .repository import RequirementQuestionLinkRepository
from .models import RequirementQuestionLinkCreate
from dependencies import get_requirement_question_link_repository

router = APIRouter()


class QuestionLinkRequest(BaseModel):
    """Request model for adding a question link."""

    question_id: str


@router.get(
    "/{requirement_id}/question-links",
    response_model=List[str],
    tags=["question_links"],
)
def list_question_links(
    requirement_id: str,
    repository: RequirementQuestionLinkRepository = Depends(
        get_requirement_question_link_repository
    ),
):
    """List question links of a requirement."""
    return repository.get_question_ids_for_requirement(requirement_id)


@router.post(
    "/{requirement_id}/question-links",
    status_code=status.HTTP_201_CREATED,
    tags=["question_links"],
)
def add_question_link(
    requirement_id: str,
    request: QuestionLinkRequest,
    repository: RequirementQuestionLinkRepository = Depends(
        get_requirement_question_link_repository
    ),
):
    """Add a question link to a requirement."""
    link_create = RequirementQuestionLinkCreate(
        requirement_id=requirement_id, question_id=request.question_id
    )
    return repository.create_link(link_create)


@router.delete(
    "/{requirement_id}/question-links/{question_id}",
    tags=["question_links"],
)
def delete_question_link(
    requirement_id: str,
    question_id: str,
    repository: RequirementQuestionLinkRepository = Depends(
        get_requirement_question_link_repository
    ),
):
    """Delete a question link from a requirement."""
    success = repository.delete_link(requirement_id, question_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question link not found")
    return {"message": "Question link deleted successfully"}
