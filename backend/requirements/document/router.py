"""
Router for handling requirement document uploads and similarity comparisons.

This router handles HTTP routing concerns only, delegating business logic
to the requirements service module.
"""

from typing import List

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Depends,
    Form,
    BackgroundTasks,
    status,
    Query,
    HTTPException,
)

from dependencies import (
    get_requirement_service,
    get_async_tasks_service,
    get_requirement_extraction_link_repository,
    get_requirement_document_service,
)
from ..crud.services import RequirementService, SIMILAR_REQUIREMENTS_LIMIT
from ..extraction_link.repository import RequirementExtractionLinkRepository
from ..crud.models import (
    SimilarRequirementWithLLM,
    MergedRequirement,
    ExtractedRequirementDto,
    ExtractedRequirementUpdate,
    ExtractedRequirementCreate,
)
from .services import RequirementDocumentService
from async_tasks.models import TaskCreateResponse
from async_tasks.services import AsyncTasksService, TaskType

router = APIRouter()


@router.post(
    "/document/{document_id}/extracted-requirements",
    response_model=ExtractedRequirementDto,
    status_code=status.HTTP_201_CREATED,
    tags=["requirements_document"],
)
async def create_extracted_requirement(
    document_id: str,
    requirement_create: ExtractedRequirementCreate,
    service: RequirementDocumentService = Depends(get_requirement_document_service),
):
    """
    Create a new extracted requirement for a specific document.
    """
    return service.create_extracted_requirement(document_id, requirement_create)


@router.delete(
    "/extracted-requirement/{extracted_requirement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["requirements_document"],
)
async def delete_extracted_requirement(
    extracted_requirement_id: str,
    service: RequirementDocumentService = Depends(get_requirement_document_service),
):
    """
    Delete an extracted requirement.
    """
    success = service.delete_extracted_requirement(extracted_requirement_id)
    if not success:
        raise HTTPException(status_code=404, detail="Extracted requirement not found")
    return None


@router.put(
    "/extracted-requirement/{extracted_requirement_id}",
    response_model=ExtractedRequirementDto,
    tags=["requirements_document"],
)
async def update_extracted_requirement(
    extracted_requirement_id: str,
    update_data: ExtractedRequirementUpdate,
    service: RequirementService = Depends(get_requirement_service),
):
    return await service.update_extracted_requirement(
        extracted_requirement_id, update_data
    )


@router.get(
    "/extracted-requirement/{extracted_requirement_id}/similar",
    response_model=List[SimilarRequirementWithLLM],
    tags=["requirements_document"],
)
async def get_similar_main_requirements_with_llm(
    extracted_requirement_id: str,
    limit: int = SIMILAR_REQUIREMENTS_LIMIT,
    filter_req: List[str] = Query(default=[]),
    service: RequirementService = Depends(get_requirement_service),
):
    """
    Finds main requirements similar to a given document requirement using vector search,
    then performs LLM-based comparison on the top results.

    Uses the extracted requirement ID to load the requirement from the database.
    Optionally filters out specific requirement IDs using the 'req' query parameter.
    """
    return await service.find_similar_requirements_with_llm(
        extracted_requirement_id, limit, filter_req or None
    )


@router.post(
    "/upload-async",
    response_model=TaskCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["requirements_document"],
)
async def upload_requirement_document_async(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    product_id: str = Form(...),
    async_tasks_service: AsyncTasksService = Depends(get_async_tasks_service),
    service: RequirementService = Depends(get_requirement_service),
):
    task_id = async_tasks_service.create_task(
        f"Extract requirements from {file.filename}", TaskType.EXTRACT_REQUIREMENTS
    )
    file_content = await file.read()
    background_tasks.add_task(
        service.upload_and_extract_requirements,
        file.filename,
        file_content,
        product_id,
        task_id,
    )

    return TaskCreateResponse(task_id=task_id)


@router.get(
    "/document",
    tags=["requirements_document"],
)
def get_requirement_documents(
    product_id: str,
    service: RequirementDocumentService = Depends(get_requirement_document_service),
):
    """
    Get all requirement documents for a specific product.

    Args:
        product_id: The ID of the product (mandatory parameter)

    Returns:
        List of requirement documents for the product and current organization
    """
    return service.get_requirement_documents(product_id)


@router.get(
    "/document/{document_id}",
    tags=["requirements_document"],
)
async def get_document_with_requirements(
    document_id: str,
    service: RequirementDocumentService = Depends(get_requirement_document_service),
):
    """
    Get document information along with its related requirements.

    Args:
        document_id: The id (UUID) of the document

    Returns:
        Combined document and requirements data
    """
    return await service.get_document_with_requirements(document_id)


@router.get(
    "/document/key/{document_key}",
    tags=["requirements_document"],
)
async def get_document_with_requirements_by_key(
    document_key: str,
    service: RequirementDocumentService = Depends(get_requirement_document_service),
):
    """
    Get document information along with its related requirements by document_key.

    Args:
        document_key: The document_key of the document

    Returns:
        Combined document and requirements data
    """
    return await service.get_document_with_requirements_by_key(document_key)


@router.get(
    "/document/{document_id}/download",
    tags=["requirements_document"],
)
async def download_document(
    document_id: str,
    service: RequirementDocumentService = Depends(get_requirement_document_service),
):
    """
    Download the original document file.

    Args:
        document_id: The id (UUID) of the document

    Returns:
        StreamingResponse containing the file content for download
    """
    return await service.download_document(document_id)


@router.get(
    "/extracted-requirement/{extracted_requirement_id}/links",
    response_model=List[str],
    tags=["requirements_document"],
)
def get_extracted_requirement_links(
    extracted_requirement_id: str,
    repository: RequirementExtractionLinkRepository = Depends(
        get_requirement_extraction_link_repository
    ),
):
    """Get all requirement IDs linked to a specific extracted requirement."""
    return repository.get_requirement_ids_for_extracted_requirement(
        extracted_requirement_id
    )


@router.delete(
    "/document/{document_id}",
    tags=["requirements_document"],
)
async def delete_document(
    document_id: str,
    service: RequirementDocumentService = Depends(get_requirement_document_service),
):
    """
    Delete a document and all its related data.

    Args:
        document_id: The UUID of the document to delete

    Returns:
        Success message if deletion was successful

    Raises:
        HTTPException: 404 if document not found or deletion failed
    """
    success = await service.delete_document(document_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="Document not found or could not be deleted"
        )

    return {"message": "Document successfully deleted"}


@router.get(
    "/extracted-requirement/{extracted_requirement_id}/generate-merge/{requirement_id}",
    response_model=MergedRequirement,
    tags=["requirements_document"],
)
async def generate_merge_requirement(
    extracted_requirement_id: str,
    requirement_id: str,
    service: RequirementDocumentService = Depends(get_requirement_document_service),
):
    """
    Generate a merged requirement from an extracted requirement and main requirement using LLM.

    Args:
        extracted_requirement_id: The ID of the extracted requirement
        requirement_id: The ID of the main requirement

    Returns:
        MergedRequirement: The merged requirement data with updated fields
    """
    return await service.generate_merge(extracted_requirement_id, requirement_id)
