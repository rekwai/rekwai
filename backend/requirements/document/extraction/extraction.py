from typing import List
import logging
from datetime import datetime, timezone

from s3_service import S3Service
from async_tasks.services import AsyncTasksService, TaskStatus
from ai_framework.workflow.requirement.extraction.orchestrator import (
    run_extraction_workflow,
)
from ai_framework.workflow.requirement.extraction.extraction_deps import (
    ExtractionDeps,
)
from requirements.document.intermediate_repository import (
    IntermediateExtractedRequirementRepository,
)

from ...crud.models import (
    ExtractedRequirement,
)

logger = logging.getLogger(__name__)


class RequirementExtractionService:
    """Service for extracting requirements from documents using the AI framework workflow.

    This service wraps the new ai_framework extraction workflow and provides compatibility
    with the existing API interface.
    """

    def __init__(
        self,
        s3_service: S3Service,
        async_tasks_service: AsyncTasksService = None,
    ):
        self.s3_service = s3_service
        self.async_tasks_service = async_tasks_service

    async def extract_requirements(
        self,
        document_name: str,
        product_id: str,
        task_id: str,
        document_id: str,
        organization_id: str,
        s3_object_key: str,
        existing_types: List[str],
    ) -> List[ExtractedRequirement]:
        """Extract requirements from a document using the AI framework workflow.

        Args:
            document_name: Original filename of the document
            product_id: ID of the product this document belongs to
            task_id: ID of the async task for progress tracking
            document_id: UUID of the document record
            organization_id: ID of the organization
            s3_object_key: S3 object key for the document
            existing_types: List of existing requirement types from the database

        Returns:
            List of ExtractedRequirement objects
        """
        start_time = datetime.now(timezone.utc)
        logger.info(f"Starting extraction for {document_name} (product: {product_id})")

        # Create cancellation callback if async_tasks_service is available
        def cancellation_check():
            if self.async_tasks_service:
                self.async_tasks_service.check_cancellation(task_id)

        # Create progress callback to update async task status
        def progress_callback(progress: float, message: str):
            if self.async_tasks_service:
                self.async_tasks_service.update_task(
                    task_id,
                    progress=progress,
                    message=message,
                )

        intermediate_repo = IntermediateExtractedRequirementRepository()
        deps = ExtractionDeps(
            s3_service=self.s3_service,
            document_id=document_id,
            organization_id=organization_id,
            document_name=document_name,
            product_id=product_id,
            s3_object_key=s3_object_key,
            intermediate_repo=intermediate_repo,
            existing_types=existing_types,
            cancellation_check=cancellation_check if self.async_tasks_service else None,
            progress_callback=progress_callback if self.async_tasks_service else None,
        )

        try:
            # Run the orchestrated extraction workflow
            result = await run_extraction_workflow(deps)

            logger.info(
                f"Workflow completed: {result['extraction']['requirements_extracted']} extracted, "
                f"{result['implementation']['requirements_analyzed']} analyzed, "
                f"{result['verification']['requirements_verified']} verified"
            )

            # Retrieve all requirements from the intermediate repository (with full metadata)
            raw_requirements = intermediate_repo.get_raw_by_document(document_id)

            # Convert intermediate requirements to ExtractedRequirement format
            extracted_requirements = [
                ExtractedRequirement(
                    document_name=req_data["document_name"],
                    description=req_data["description"],
                    product_id=req_data["product_id"],
                    types=req_data["types"],
                    requirement_verification=req_data.get("requirement_verification"),
                    implementation_status=req_data.get("implementation_status"),
                    implementation_description=req_data.get(
                        "implementation_description"
                    ),
                    extraction_timestamp=req_data["extraction_timestamp"],
                    order=req_data["order"],
                )
                for req_data in raw_requirements
            ]

            extraction_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.info(
                f"Extracted {len(extracted_requirements)} requirements from {document_name}. "
                f"Extraction time: {extraction_time:.2f}s"
            )

            return extracted_requirements

        except Exception as e:
            logger.error(f"Error during requirement extraction: {e}", exc_info=True)
            if self.async_tasks_service:
                self.async_tasks_service.update_task(
                    task_id,
                    status=TaskStatus.FAILED,
                    error=f"Failed to extract requirements: {str(e)}",
                )
            raise
