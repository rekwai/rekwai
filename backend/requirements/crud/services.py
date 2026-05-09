"""
Business logic services for requirements operations.
"""

import asyncio
import logging
from pathlib import Path
from typing import List
import uuid6

from fastapi import HTTPException

from s3_service import S3Service
from ai.extract_markdown import extract_text_from_file
from ai.external_ai import ExternalAIService
from . import models
from .repository import RequirementRepository
from .comparison import RequirementComparisonService
from ..document.extraction.extraction import RequirementExtractionService
from questionnaire.rag.answer_questions import (
    RagQuestionAnsweringService,
    QuestionAnswer,
)
from auth.org_context import get_organization_id
from async_tasks.services import AsyncTasksService, TaskStatus
from async_tasks.exceptions import TaskCancelledException
from ..document.services import RequirementDocumentService
from ..document.models import RequirementDocumentCreate
from ..extraction_link.repository import RequirementExtractionLinkRepository
from ..extraction_link.models import RequirementExtractionLinkCreate
from product.repository import ProductRepository

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".xls", ".xlsx"}
SIMILAR_REQUIREMENTS_LIMIT = 5


def _build_text_to_embed(
    description: str | None, implementation_description: str | None
) -> str:
    """Build the text to embed from description and implementation_description."""
    text = description or ""
    if implementation_description:
        text += f"\nImplementation: {implementation_description}"
    return text.strip()


class RequirementService:
    def __init__(
        self,
        repository: RequirementRepository,
        rag_service: RagQuestionAnsweringService,
        comparison_service: RequirementComparisonService,
        extraction_service: RequirementExtractionService,
        external_ai_service: ExternalAIService,
        s3_service: S3Service,
        requirement_document_service: RequirementDocumentService,
        extraction_link_repository: RequirementExtractionLinkRepository,
        async_tasks_service: AsyncTasksService,
    ):
        self.repository = repository
        self.product_repository = ProductRepository(repository.db)
        self.rag_service = rag_service
        self.comparison_service = comparison_service
        self.extraction_service = extraction_service
        self.external_ai_service = external_ai_service
        self.s3_service = s3_service
        self.requirement_document_service = requirement_document_service
        self.extraction_link_repository = extraction_link_repository
        self.async_tasks_service = async_tasks_service

    async def create_requirement(
        self, requirement_data: models.RequirementCreate
    ) -> models.RequirementDto:
        # Validate product_id and generate key BEFORE expensive embedding call
        org_id = get_organization_id()
        row = self.product_repository.increment_and_get_product_key(
            requirement_data.product_id
        )
        if not row:
            raise HTTPException(
                status_code=400, detail="Invalid product_id for requirement creation"
            )
        current_number, product_key = row
        requirement_key = f"{product_key}-{current_number}"

        text_to_embed = _build_text_to_embed(
            requirement_data.description, requirement_data.implementation_description
        )
        embedding = await self.external_ai_service.create_embeddings(text_to_embed)
        requirement_data.embedding = embedding

        return self.repository.create(
            requirement_data, organization_id=org_id, requirement_key=requirement_key
        )

    def get_requirement(self, requirement_id: str) -> models.RequirementDto:
        req = self.repository.get(requirement_id)
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found")
        return req

    def get_requirement_by_key(self, requirement_key: str) -> models.RequirementDto:
        """Get a requirement by its requirement_key."""
        org_id = get_organization_id()
        req = self.repository.get_by_key(requirement_key, org_id)
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found")
        return req

    def get_requirements(
        self, product_id: str, skip: int = 0, limit: int = 100
    ) -> List[models.RequirementDto]:
        return self.repository.list(product_id, skip, limit)

    async def update_requirement(
        self, requirement_id: str, update_data: models.RequirementUpdate
    ) -> models.RequirementDto:
        new_embedding = None
        if update_data.description or update_data.implementation_description:
            current_req = self.repository.get(requirement_id)
            if not current_req:
                raise HTTPException(status_code=404, detail="Requirement not found")
            new_description = update_data.description or current_req.description
            new_implementation = (
                update_data.implementation_description
                or current_req.implementation_description
            )
            text_to_embed = _build_text_to_embed(new_description, new_implementation)
            new_embedding = await self.external_ai_service.create_embeddings(
                text_to_embed
            )
        return self.repository.update(requirement_id, update_data, new_embedding)

    def delete_requirement(self, requirement_id: str) -> models.RequirementDto:
        deleted_req = self.repository.delete(requirement_id)
        if not deleted_req:
            raise HTTPException(status_code=404, detail="Requirement not found")
        return deleted_req

    def _create_extraction_link_with_history(
        self,
        requirement_id: str,
        extracted_requirement_id: str,
        link_type: str,
    ) -> None:
        """Create an extraction link and provenance history in one transaction."""
        link_data = RequirementExtractionLinkCreate(
            requirement_id=requirement_id,
            extracted_requirement_id=extracted_requirement_id,
            link_type=link_type,
        )
        self.extraction_link_repository.create_link(link_data, commit=False)
        self.repository.record_extraction_link_history(
            requirement_id=requirement_id,
            link_type=link_type,
            extracted_requirement_id=extracted_requirement_id,
            commit=False,
        )
        self.repository.db.commit()

    async def bulk_accept_suggestions_for_document(
        self, document_id: str
    ) -> models.BulkAcceptSuggestionsResult:
        """Approve stored suggestions for a document without re-suggesting.

        If accepting one suggestion invalidates later merge suggestions targeting the
        same requirement, those later extracted requirements are skipped so users can
        review them manually outside the bulk flow.
        """
        self.requirement_document_service.get_by_id(document_id)
        extracted_requirements = self.repository.get_extracted_requirements_by_document_id(
            document_id
        )
        result = models.BulkAcceptSuggestionsResult()
        invalidated_ids: set[str] = set()

        for extracted_requirement in extracted_requirements:
            extracted_id = str(extracted_requirement.id)
            action = extracted_requirement.suggested_action

            if self.extraction_link_repository.get_links_for_extracted_requirement(
                extracted_id
            ):
                result.skipped += 1
                result.already_linked += 1
                result.items.append(
                    models.BulkAcceptSuggestionItem(
                        extracted_requirement_id=extracted_id,
                        status="skipped",
                        action=action,
                        reason="already_linked",
                    )
                )
                continue

            if extracted_id in invalidated_ids:
                result.skipped += 1
                result.invalidated_duplicate += 1
                result.items.append(
                    models.BulkAcceptSuggestionItem(
                        extracted_requirement_id=extracted_id,
                        status="skipped",
                        action=action,
                        reason="invalidated_duplicate",
                    )
                )
                continue

            if not action:
                result.skipped += 1
                result.no_suggestion += 1
                result.items.append(
                    models.BulkAcceptSuggestionItem(
                        extracted_requirement_id=extracted_id,
                        status="skipped",
                        reason="no_suggestion",
                    )
                )
                continue

            if action == models.SuggestedActionType.ATTACH.value:
                accept_result = self.requirement_document_service.accept_suggestion(
                    extracted_id
                )
                accepted_invalidated_ids = accept_result.get("invalidated_ids", [])
                invalidated_ids.update(accepted_invalidated_ids)
                result.accepted += 1
                result.items.append(
                    models.BulkAcceptSuggestionItem(
                        extracted_requirement_id=extracted_id,
                        status="accepted",
                        action=models.SuggestedActionType.ATTACH,
                        requirement_id=accept_result.get("target_requirement_id"),
                        invalidated_ids=accepted_invalidated_ids,
                    )
                )
                continue

            if action == models.SuggestedActionType.MERGE.value:
                target_id = (
                    str(extracted_requirement.suggested_target_requirement_id)
                    if extracted_requirement.suggested_target_requirement_id
                    else None
                )
                if not target_id:
                    result.skipped += 1
                    result.items.append(
                        models.BulkAcceptSuggestionItem(
                            extracted_requirement_id=extracted_id,
                            status="skipped",
                            action=models.SuggestedActionType.MERGE,
                            reason="missing_target",
                        )
                    )
                    continue

                merge_preview = models.MergedRequirement.from_json(
                    extracted_requirement.merge_preview
                )
                if not merge_preview:
                    result.skipped += 1
                    result.items.append(
                        models.BulkAcceptSuggestionItem(
                            extracted_requirement_id=extracted_id,
                            status="skipped",
                            action=models.SuggestedActionType.MERGE,
                            reason="missing_merge_preview",
                        )
                    )
                    continue

                await self.update_requirement(
                    target_id,
                    models.RequirementUpdate(
                        description=merge_preview.description,
                        types=merge_preview.types,
                        requirement_verification=merge_preview.requirement_verification,
                        implementation_description=merge_preview.implementation_description,
                        implementation_status=merge_preview.implementation_status,
                        product_id=str(extracted_requirement.product_id),
                    ),
                )
                self._create_extraction_link_with_history(
                    target_id, extracted_id, "merge"
                )
                accept_result = self.requirement_document_service.accept_suggestion(
                    extracted_id
                )
                accepted_invalidated_ids = accept_result.get("invalidated_ids", [])
                invalidated_ids.update(accepted_invalidated_ids)
                result.accepted += 1
                result.items.append(
                    models.BulkAcceptSuggestionItem(
                        extracted_requirement_id=extracted_id,
                        status="accepted",
                        action=models.SuggestedActionType.MERGE,
                        requirement_id=target_id,
                        invalidated_ids=accepted_invalidated_ids,
                    )
                )
                continue

            if action == models.SuggestedActionType.CREATE_NEW.value:
                if extracted_requirement.implementation_description is None:
                    raise ValueError(
                        f"Extracted requirement {extracted_id} is missing "
                        "implementation_description"
                    )
                if extracted_requirement.implementation_status is None:
                    raise ValueError(
                        f"Extracted requirement {extracted_id} is missing "
                        "implementation_status"
                    )

                types = self.repository.get_extracted_requirement_types(extracted_id)
                created = await self.create_requirement(
                    models.RequirementCreate(
                        description=extracted_requirement.description,
                        types=types,
                        requirement_verification=extracted_requirement.requirement_verification,
                        implementation_description=extracted_requirement.implementation_description,
                        implementation_status=extracted_requirement.implementation_status,
                        product_id=str(extracted_requirement.product_id),
                    )
                )
                self._create_extraction_link_with_history(
                    created.id, extracted_id, "create"
                )
                accept_result = self.requirement_document_service.accept_suggestion(
                    extracted_id
                )
                accepted_invalidated_ids = accept_result.get("invalidated_ids", [])
                result.accepted += 1
                result.items.append(
                    models.BulkAcceptSuggestionItem(
                        extracted_requirement_id=extracted_id,
                        status="accepted",
                        action=models.SuggestedActionType.CREATE_NEW,
                        requirement_id=created.id,
                        invalidated_ids=accepted_invalidated_ids,
                    )
                )
                continue

            result.skipped += 1
            result.items.append(
                models.BulkAcceptSuggestionItem(
                    extracted_requirement_id=extracted_id,
                    status="skipped",
                    reason="unsupported_action",
                )
            )

        return result

    def get_distinct_requirement_types(self) -> List[str]:
        org_id = get_organization_id()
        return self.repository.get_distinct_types(org_id)

    def get_requirement_history(
        self, requirement_id: str
    ) -> List[models.RequirementHistory]:
        return self.repository.get_history(requirement_id)

    def _generate_document_key(self, product_id: str) -> str:
        """Generate a document key for a new requirement document.

        Args:
            product_id: The ID of the product

        Returns:
            A formatted document key string (e.g., "PROJ-D-1")

        Raises:
            HTTPException: If the product_id is invalid
        """
        row = self.product_repository.increment_and_get_requirement_document_key(
            product_id
        )
        if not row:
            raise HTTPException(
                status_code=400, detail="Invalid product_id for document creation"
            )
        current_number, product_key = row

        # Format: {PRODUCT_KEY}-D-{NUMBER}
        return f"{product_key}-D-{current_number}"

    async def _cleanup_partial_upload(
        self,
        s3_keys: List[str],
        document_id: str | None,
        extracted_requirement_ids: List[str],
    ) -> None:
        """
        Clean up partial data from a failed or cancelled upload.

        Args:
            s3_keys: List of S3 object keys to delete
            document_id: Document ID to delete (if created)
            extracted_requirement_ids: List of extracted requirement IDs to delete
        """
        logger.info(
            f"Cleaning up partial upload: s3_keys={len(s3_keys)}, document_id={document_id}, "
            f"extracted_requirements={len(extracted_requirement_ids)}"
        )

        # Delete extraction links and extracted requirements
        for req_id in extracted_requirement_ids:
            try:
                self.extraction_link_repository.delete_links_for_extracted_requirement(
                    req_id
                )
                self.repository.delete_extracted_requirement(req_id)
            except Exception as e:
                logger.warning(f"Error cleaning up extracted requirement {req_id}: {e}")

        # Delete document record
        if document_id:
            try:
                self.requirement_document_service.repository.delete(document_id)
            except Exception as e:
                logger.warning(f"Error cleaning up document {document_id}: {e}")

        # Delete S3 files
        for s3_key in s3_keys:
            try:
                await self.s3_service.delete_file(
                    S3Service.UPLOAD_DOCUMENTS_BUCKET, s3_key
                )
            except Exception as e:
                logger.warning(f"Error cleaning up S3 file {s3_key}: {e}")

    async def upload_and_extract_requirements(
        self, file_name: str, file_content: bytes, product_id: str, task_id: str = None
    ) -> List[models.ExtractedRequirement]:
        file_extension = Path(file_name).suffix.lower()

        self.async_tasks_service.update_task(
            task_id,
            status=TaskStatus.RUNNING,
            progress=0.1,
            message="Starting file processing",
        )

        if file_extension not in ALLOWED_EXTENSIONS:
            self.async_tasks_service.update_task(
                task_id,
                status=TaskStatus.FAILED,
                error=f"Invalid file type '{file_extension}'. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
            )
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type '{file_extension}'. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
            )

        if not file_content:
            self.async_tasks_service.update_task(
                task_id, status=TaskStatus.FAILED, error="Uploaded file is empty"
            )
            raise HTTPException(status_code=422, detail="Uploaded file is empty.")

        organization_id = get_organization_id()
        document_uuid = str(uuid6.uuid7())  # using time-ordered uuid7

        # Track created resources for cleanup
        created_s3_keys: List[str] = []
        created_document_id: str | None = None
        created_extracted_requirement_ids: List[str] = []
        extraction_complete = False  # Set to True after requirements are saved to DB

        try:
            s3_object_key = f"{organization_id}/requirement_documents/{document_uuid}{file_extension}"
            await self.s3_service.save_file(
                bucket_name=self.s3_service.UPLOAD_DOCUMENTS_BUCKET,
                object_key=s3_object_key,
                file_content=file_content,
            )
            created_s3_keys.append(s3_object_key)

            # Check for cancellation after S3 upload
            self.async_tasks_service.check_cancellation(task_id)

            self.async_tasks_service.update_task(
                task_id, progress=0.2, message="Extracting text from document"
            )

            extracted_markdown = await extract_text_from_file(file_content, file_name)
            if not extracted_markdown or not extracted_markdown.strip():
                self.async_tasks_service.update_task(
                    task_id,
                    status=TaskStatus.COMPLETED,
                    progress=1.0,
                    message="No text content found in document",
                )
                return []

            # Check for cancellation after text extraction
            self.async_tasks_service.check_cancellation(task_id)

            # Save extracted markdown to S3 for AI processing
            markdown_s3_key = (
                f"{organization_id}/requirement_documents/{document_uuid}_extracted.md"
            )
            await self.s3_service.save_file(
                bucket_name=self.s3_service.UPLOAD_DOCUMENTS_BUCKET,
                object_key=markdown_s3_key,
                file_content=extracted_markdown.encode("utf-8"),
            )
            created_s3_keys.append(markdown_s3_key)

            self.async_tasks_service.update_task(
                task_id, progress=0.4, message="Extracting requirements using AI"
            )

            # Check for cancellation before AI extraction
            self.async_tasks_service.check_cancellation(task_id)

            # Validate product_id and generate document key BEFORE expensive AI extraction
            document_key = self._generate_document_key(product_id)

            # Get existing requirement types for the organization
            existing_types = self.repository.get_distinct_types(organization_id)

            extracted_requirements = await self.extraction_service.extract_requirements(
                document_name=file_name,
                product_id=product_id,
                task_id=task_id,
                document_id=document_uuid,
                organization_id=organization_id,
                s3_object_key=markdown_s3_key,
                existing_types=existing_types,
            )

            # Check for cancellation after AI extraction
            self.async_tasks_service.check_cancellation(task_id)

            # Remove file extension from the filename for display purposes
            filename_without_extension = Path(file_name).stem

            document_data = RequirementDocumentCreate(
                id=document_uuid,
                s3_object_key=s3_object_key,
                organization_id=organization_id,
                product_id=product_id,
                original_filename=filename_without_extension,
                file_extension=file_extension,
                content_size_bytes=len(file_content),
                document_key=document_key,
            )
            created_document = self.requirement_document_service.create(document_data)
            created_document_id = str(created_document.id)

            # Save all extracted document requirements in the database
            saved_extracted_requirements = []
            for extracted_requirement in extracted_requirements:
                saved_req = self.repository.create_extracted_requirement(
                    extracted_requirement_data=extracted_requirement,
                    document_id=created_document.id,
                    organization_id=organization_id,
                    order=extracted_requirement.order,
                )
                saved_extracted_requirements.append(saved_req)
                created_extracted_requirement_ids.append(str(saved_req.id))

            # Mark extraction as complete - failures after this point should NOT cleanup
            extraction_complete = True

            # Check for cancellation after saving requirements
            self.async_tasks_service.check_cancellation(task_id)

            # Generate AI suggestions for each extracted requirement (parallel)
            self.async_tasks_service.update_task(
                task_id,
                progress=0.85,
                message="Generating AI suggestions...",
            )

            async def generate_suggestion(saved_req) -> int:
                """Generate and store AI suggestion for a single extracted requirement."""
                try:
                    await self.suggest_action_for_extracted_requirement(
                        extracted_requirement_id=str(saved_req.id),
                        filter_reqs=None,
                    )
                    return 1
                except TaskCancelledException:
                    raise
                except Exception as req_error:
                    logger.warning(
                        f"Error generating suggestion for extracted requirement {saved_req.id}: {req_error}"
                    )
                    return 0

            # Run all suggestions in parallel
            suggestion_results = await asyncio.gather(
                *[generate_suggestion(req) for req in saved_extracted_requirements]
            )
            total_suggestions = sum(suggestion_results)

            self.async_tasks_service.update_task(
                task_id,
                status=TaskStatus.COMPLETED,
                progress=1.0,
                message=f"Successfully extracted {len(extracted_requirements)} requirements and generated {total_suggestions} AI suggestions",
                entity_id=created_document.document_key,
            )

            return extracted_requirements

        except TaskCancelledException:
            logger.info(
                f"Task {task_id} was cancelled (extraction_complete={extraction_complete})"
            )
            if self.async_tasks_service.should_cleanup_cancelled_task(
                task_id, extraction_complete
            ):
                logger.info(f"Cleaning up partial data for task {task_id}...")
                await self._cleanup_partial_upload(
                    s3_keys=created_s3_keys,
                    document_id=created_document_id,
                    extracted_requirement_ids=created_extracted_requirement_ids,
                )
            self.async_tasks_service.finalize_cancellation(
                task_id, message="Requirements upload cancelled"
            )
            raise
        except HTTPException:
            # Only clean up on HTTP exceptions if extraction not complete
            if not extraction_complete:
                logger.info(f"HTTP error during task {task_id}, cleaning up...")
                await self._cleanup_partial_upload(
                    s3_keys=created_s3_keys,
                    document_id=created_document_id,
                    extracted_requirement_ids=created_extracted_requirement_ids,
                )
            raise
        except Exception as e:
            logger.error(f"Error during requirement upload: {e}", exc_info=True)
            # Only clean up if extraction not complete
            if not extraction_complete:
                await self._cleanup_partial_upload(
                    s3_keys=created_s3_keys,
                    document_id=created_document_id,
                    extracted_requirement_ids=created_extracted_requirement_ids,
                )
            self.async_tasks_service.update_task(
                task_id, status=TaskStatus.FAILED, error=str(e)
            )
            raise HTTPException(status_code=500, detail=str(e))

    async def update_extracted_requirement(
        self,
        extracted_requirement_id: str,
        update_data: models.ExtractedRequirementUpdate,
    ) -> models.ExtractedRequirementDto:
        updated = self.repository.update_extracted_requirement(
            extracted_requirement_id, update_data
        )
        if not updated:
            raise HTTPException(
                status_code=404, detail="Extracted requirement not found"
            )
        types = self.repository.get_extracted_requirement_types(
            extracted_requirement_id
        )
        linked_req_ids = self.extraction_link_repository.get_requirement_ids_for_extracted_requirement(
            extracted_requirement_id
        )
        # Resolve suggested target requirement if set
        suggested_target_req = None
        if updated.suggested_target_requirement_id:
            suggested_target_req = self.repository.get(
                str(updated.suggested_target_requirement_id)
            )

        return models.ExtractedRequirementDto(
            id=str(updated.id),
            document_name=updated.document_name,
            description=updated.description,
            product_id=updated.product_id,
            types=types,
            requirement_verification=updated.requirement_verification,
            implementation_status=updated.implementation_status,
            implementation_description=updated.implementation_description,
            extraction_timestamp=updated.extraction_timestamp,
            order=updated.order,
            has_links=len(linked_req_ids) > 0,
            suggested_action=updated.suggested_action,
            suggested_target_requirement_id=str(updated.suggested_target_requirement_id)
            if updated.suggested_target_requirement_id
            else None,
            suggestion_justification=updated.suggestion_justification,
            suggestion_similarity_score=updated.suggestion_similarity_score,
            suggested_target_requirement=suggested_target_req,
            merge_preview=models.MergedRequirement.from_json(updated.merge_preview),
        )

    async def suggest_action_for_extracted_requirement(
        self,
        extracted_requirement_id: str,
        filter_reqs: List[str] = None,
    ) -> models.SuggestedAction:
        """Suggest a single action (attach, merge, or create_new) for an extracted requirement."""
        extracted_requirement = self.repository.get_extracted_requirement_by_id(
            extracted_requirement_id
        )
        if not extracted_requirement:
            raise HTTPException(
                status_code=404,
                detail=f"Extracted requirement with id {extracted_requirement_id} not found.",
            )

        if not extracted_requirement.description:
            raise HTTPException(
                status_code=400,
                detail="Document requirement does not have description text.",
            )

        text_to_embed = _build_text_to_embed(
            extracted_requirement.description,
            extracted_requirement.implementation_description,
        )

        # Build full extracted requirement text for the LLM
        types = self.repository.get_extracted_requirement_types(
            extracted_requirement_id
        )
        doc_req_text = (
            f"Description: {extracted_requirement.description}\n"
            f"Types: {', '.join(types) if types else 'N/A'}\n"
            f"Implementation: {extracted_requirement.implementation_status or 'N/A'}"
            f" — {extracted_requirement.implementation_description or 'N/A'}\n"
            f"Verification: {extracted_requirement.requirement_verification or 'N/A'}"
        )

        suggestion = await self.comparison_service.decide_action_for_requirement(
            text_to_embed=text_to_embed,
            doc_req_text=doc_req_text,
            product_id=extracted_requirement.product_id,
            limit=SIMILAR_REQUIREMENTS_LIMIT,
            filter_reqs=filter_reqs,
        )

        # Persist the suggestion on the extracted requirement row
        self.repository.set_extracted_requirement_suggestion(
            extracted_requirement_id,
            action=suggestion.action.value,
            target_requirement_id=suggestion.target_requirement_id,
            justification=suggestion.justification,
            similarity_score=suggestion.similarity_score,
        )

        # Pre-generate merge preview for merge suggestions
        if (
            suggestion.action.value == "merge"
            and suggestion.target_requirement_id
        ):
            merge_preview = await self.requirement_document_service.generate_merge(
                extracted_requirement_id,
                suggestion.target_requirement_id,
            )
            self.repository.set_extracted_requirement_merge_preview(
                extracted_requirement_id, merge_preview.model_dump()
            )
            suggestion.merge_preview = merge_preview

        return suggestion

    async def answer_question(
        self,
        question: str,
        product_id: str,
    ) -> QuestionAnswer:
        return await self.rag_service.answer_question_with_rag(
            question_text=question,
            product_id=product_id,
            organization_id=get_organization_id(),
        )
