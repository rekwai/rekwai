"""API endpoints for managing extraction links."""

from typing import List

from fastapi import APIRouter, status, Depends, HTTPException
from pydantic import BaseModel

from .repository import RequirementExtractionLinkRepository
from .models import RequirementExtractionLinkCreate, LinkType
from requirements.crud.repository import RequirementRepository
from dependencies import get_requirement_extraction_link_repository, get_requirement_repository

router = APIRouter()


class ExtractionLinkRequest(BaseModel):
    """Request model for adding an extraction link."""

    extracted_requirement_id: str
    link_type: LinkType | None = None


@router.get(
    "/{requirement_id}/extraction-links",
    response_model=List[str],
    tags=["extraction_links"],
)
def list_extraction_links(
    requirement_id: str,
    repository: RequirementExtractionLinkRepository = Depends(
        get_requirement_extraction_link_repository
    ),
):
    """List extraction links of a requirement."""
    return repository.get_extracted_requirement_ids_for_requirement(requirement_id)


@router.post(
    "/{requirement_id}/extraction-links",
    status_code=status.HTTP_201_CREATED,
    tags=["extraction_links"],
)
def add_extraction_link(
    requirement_id: str,
    request: ExtractionLinkRequest,
    repository: RequirementExtractionLinkRepository = Depends(
        get_requirement_extraction_link_repository
    ),
    requirement_repository: RequirementRepository = Depends(
        get_requirement_repository
    ),
):
    """Add an extraction link to a requirement."""
    link_create = RequirementExtractionLinkCreate(
        requirement_id=requirement_id,
        extracted_requirement_id=request.extracted_requirement_id,
        link_type=request.link_type,
    )
    result = repository.create_link(link_create)

    # Record history on the main requirement
    if request.link_type:
        db_extracted_req = requirement_repository.get_extracted_requirement_by_id(
            request.extracted_requirement_id
        )
        if db_extracted_req:
            main_req = requirement_repository.get(requirement_id)
            requirement_repository.log_extraction_action(
                requirement_id=requirement_id,
                product_id=str(db_extracted_req.product_id),
                link_type=request.link_type,
                extracted_requirement_id=request.extracted_requirement_id,
                document_id=str(db_extracted_req.document_id),
                new_data=main_req,
            )

    return result


@router.delete(
    "/{requirement_id}/extraction-links/{extracted_requirement_id}",
    tags=["extraction_links"],
)
def delete_extraction_link(
    requirement_id: str,
    extracted_requirement_id: str,
    repository: RequirementExtractionLinkRepository = Depends(
        get_requirement_extraction_link_repository
    ),
):
    """Delete an extraction link from a requirement."""
    success = repository.delete_link(requirement_id, extracted_requirement_id)
    if not success:
        raise HTTPException(status_code=404, detail="Extraction link not found")
    return {"message": "Extraction link deleted successfully"}
