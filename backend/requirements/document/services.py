"""Service layer for requirement document-related operations."""

import logging
from typing import List
from io import BytesIO

from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from . import models
from .repository import RequirementDocumentRepository
from ..crud.repository import RequirementRepository
from ..crud import models as crud_models
from ..extraction_link.repository import RequirementExtractionLinkRepository
from ..extraction_link.models import RequirementExtractionLinkCreate
from auth.org_context import get_organization_id
from s3_service import S3Service
from ai_framework.agent import create_agent
from ai_framework.agent_utils import run_agent_with_retry
from ai_framework.workflow.requirement.extraction.agents.sub_agents import (
    create_quality_check_agent,
    create_quality_fix_agent,
    create_type_consistency_agent,
)
from ai_framework.workflow.requirement.extraction.validators import (
    validate_implementation_inline,
    validate_verification_inline,
)

log = logging.getLogger(__name__)


class RequirementDocumentService:
    """Service for handling requirement document-related business logic."""

    def __init__(
        self,
        repository: RequirementDocumentRepository,
        requirement_repository: RequirementRepository,
        extraction_link_repository: RequirementExtractionLinkRepository,
        s3_service: S3Service,
    ):
        self.repository = repository
        self.requirement_repository = requirement_repository
        self.extraction_link_repository = extraction_link_repository
        self.s3_service = s3_service

    def create(
        self, document_data: models.RequirementDocumentCreate
    ) -> models.RequirementDocument:
        """Create a new requirement document."""
        return self.repository.create(document_data)

    def get_by_id(self, document_id: str) -> models.RequirementDocument:
        """Get a requirement document by its ID, raising HTTPException if not found."""
        document = self.repository.get_by_id(document_id)
        if not document:
            raise HTTPException(
                status_code=404, detail="Requirement document not found"
            )
        return document

    def get_by_product(
        self, product_id: str, organization_id: str
    ) -> List[models.RequirementDocument]:
        """Get all requirement documents for a specific product and organization."""
        return self.repository.get_by_product(product_id, organization_id)

    def get_by_key(self, document_key: str) -> models.RequirementDocument:
        """Get a requirement document by its document_key, raising HTTPException if not found."""
        org_id = get_organization_id()
        document = self.repository.get_by_key(document_key, org_id)
        if not document:
            raise HTTPException(
                status_code=404, detail="Requirement document not found"
            )
        return document

    async def get_document_with_requirements(self, document_id: str):
        """
        Get document information along with its related requirements.

        Args:
            document_id: The id of the document

        Returns:
            A dictionary containing document information and its requirements
        """
        document = self.get_by_id(document_id)

        extracted_requirements_db = (
            self.requirement_repository.get_extracted_requirements_by_document_id(
                document_id
            )
        )

        requirements_list = []
        for extracted_requirement_db in extracted_requirements_db:
            req_id = str(extracted_requirement_db.id)
            types = self.requirement_repository.get_extracted_requirement_types(req_id)
            linked_req_ids = self.extraction_link_repository.get_requirement_ids_for_extracted_requirement(
                req_id
            )

            # Resolve suggested target requirement if set
            suggested_target_req = None
            if extracted_requirement_db.suggested_target_requirement_id:
                suggested_target_req = self.requirement_repository.get(
                    str(extracted_requirement_db.suggested_target_requirement_id)
                )

            extracted_requirement_dto = crud_models.ExtractedRequirementDto(
                id=req_id,
                document_name=extracted_requirement_db.document_name,
                description=extracted_requirement_db.description,
                product_id=extracted_requirement_db.product_id,
                types=types,
                requirement_verification=extracted_requirement_db.requirement_verification,
                implementation_status=extracted_requirement_db.implementation_status,
                implementation_description=extracted_requirement_db.implementation_description,
                extraction_timestamp=extracted_requirement_db.extraction_timestamp,
                order=extracted_requirement_db.order,
                has_links=len(linked_req_ids) > 0,
                suggested_action=extracted_requirement_db.suggested_action,
                suggested_target_requirement_id=str(extracted_requirement_db.suggested_target_requirement_id)
                if extracted_requirement_db.suggested_target_requirement_id
                else None,
                suggestion_justification=extracted_requirement_db.suggestion_justification,
                suggestion_similarity_score=extracted_requirement_db.suggestion_similarity_score,
                suggested_target_requirement=suggested_target_req,
            )

            requirements_list.append(extracted_requirement_dto)

        # Combine document and requirements data
        return {
            "product_id": str(document.product_id),
            "original_filename": document.original_filename,
            "file_extension": document.file_extension,
            "content_size_bytes": document.content_size_bytes,
            "document_key": document.document_key,
            "created_at": document.created_at.isoformat()
            if document.created_at
            else None,
            "requirements": requirements_list,
        }

    async def get_document_with_requirements_by_key(self, document_key: str):
        """
        Get document information along with its related requirements by document_key.

        Args:
            document_key: The document_key of the document

        Returns:
            A dictionary containing document information and its requirements
        """
        document = self.get_by_key(document_key)
        return await self.get_document_with_requirements(str(document.id))

    def get_requirement_documents(self, product_id: str) -> List:
        """Get all requirement documents for a specific product and current organization."""
        organization_id = get_organization_id()
        documents = self.get_by_product(product_id, organization_id)

        # Convert full document objects to limited format
        limited_documents = []
        for document in documents:
            doc_id = str(document.id)
            # Get the count of extracted requirements for this document
            requirements_count = (
                self.requirement_repository.count_extracted_requirements_by_document_id(
                    doc_id
                )
            )
            # Get the count of linked extracted requirements
            linked_requirements_count = self.extraction_link_repository.count_linked_extracted_requirements_for_document(
                doc_id
            )

            limited_documents.append(
                {
                    "id": doc_id,
                    "product_id": document.product_id,
                    "original_filename": document.original_filename,
                    "file_extension": document.file_extension,
                    "content_size_bytes": document.content_size_bytes,
                    "document_key": document.document_key,
                    "created_at": document.created_at,
                    "requirements_count": requirements_count,
                    "linked_requirements_count": linked_requirements_count,
                }
            )

        return limited_documents

    async def download_document(self, document_id: str) -> StreamingResponse:
        """
        Download a document file from S3.

        Args:
            document_id: The ID of the document to download

        Returns:
            StreamingResponse containing the file content for download

        Raises:
            HTTPException: If document not found or download fails
        """
        # Load the document from the database
        document = self.get_by_id(document_id)

        # Download the file from S3 (raises HTTPException on failure)
        file_content = await self.s3_service.download_file(
            S3Service.UPLOAD_DOCUMENTS_BUCKET, document.s3_object_key
        )

        # Create a streaming response for download
        file_stream = BytesIO(file_content)

        # Reconstruct the full filename with extension for download
        full_filename = f"{document.original_filename}{document.file_extension}"

        return StreamingResponse(
            content=iter(lambda: file_stream.read(8192), b""),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={full_filename}"},
        )

    async def delete_document(self, document_id: str) -> bool:
        """
        Delete a document and all its related data.

        This method will:
        1. Load all extracted requirements using get_extracted_requirements_by_document_id
        2. Delete all extraction links for each extracted requirement
        3. Delete all extracted requirements
        4. Delete the file from MinIO using S3Service
        5. Delete the requirement document

        Args:
            document_id: The ID of the document to delete

        Returns:
            bool: True if successful

        Raises:
            HTTPException: If document not found
        """
        # Get the document to access file information (raises HTTPException if not found)
        document = self.get_by_id(document_id)

        # Step 1: Load all extracted requirements
        extracted_requirements = (
            self.requirement_repository.get_extracted_requirements_by_document_id(
                document_id
            )
        )

        # Step 2: Delete all extraction links for each extracted requirement
        for extracted_req in extracted_requirements:
            self.extraction_link_repository.delete_links_for_extracted_requirement(
                str(extracted_req.id)
            )

        # Step 3: Delete all extracted requirements
        for extracted_req in extracted_requirements:
            self.requirement_repository.delete_extracted_requirement(
                str(extracted_req.id)
            )

        # Step 4: Delete the file
        await self.s3_service.delete_file(
            S3Service.UPLOAD_DOCUMENTS_BUCKET, document.s3_object_key
        )

        # Step 5: Delete the requirement document
        return self.repository.delete(document_id)

    def accept_suggestion(self, extracted_requirement_id: str) -> dict:
        """Accept the AI suggestion for an extracted requirement.

        For attach: creates the extraction link and clears suggestion columns.
        For merge: only clears suggestion columns (link is created after merge completion).
        For create_new: just clears suggestion columns (requirement creation handled by frontend).
        """
        db_req = self.requirement_repository.get_extracted_requirement_by_id(
            extracted_requirement_id
        )
        if not db_req:
            raise HTTPException(
                status_code=404, detail="Extracted requirement not found"
            )

        if not db_req.suggested_action:
            raise HTTPException(
                status_code=400, detail="No suggestion to accept"
            )

        action = db_req.suggested_action
        target_id = (
            str(db_req.suggested_target_requirement_id)
            if db_req.suggested_target_requirement_id
            else None
        )

        # For attach: create the extraction link immediately
        # For merge: skip link creation (link is created after user completes the merge)
        if action == "attach" and target_id:
            try:
                link_data = RequirementExtractionLinkCreate(
                    requirement_id=target_id,
                    extracted_requirement_id=extracted_requirement_id,
                )
                self.extraction_link_repository.create_link(link_data)
            except ValueError:
                log.info(
                    f"Link already exists for requirement {target_id} "
                    f"and extracted requirement {extracted_requirement_id}"
                )

        # Clear suggestion columns
        self.requirement_repository.set_extracted_requirement_suggestion(
            extracted_requirement_id
        )

        return {"action": action, "target_requirement_id": target_id}

    def dismiss_suggestion(self, extracted_requirement_id: str) -> dict:
        """Dismiss the AI suggestion by clearing all suggestion columns."""
        db_req = self.requirement_repository.get_extracted_requirement_by_id(
            extracted_requirement_id
        )
        if not db_req:
            raise HTTPException(
                status_code=404, detail="Extracted requirement not found"
            )

        self.requirement_repository.set_extracted_requirement_suggestion(
            extracted_requirement_id
        )

        return {"status": "dismissed"}

    async def generate_merge(
        self, extracted_requirement_id: str, requirement_id: str
    ) -> crud_models.MergedRequirement:
        """
        Generate a merged requirement from an extracted requirement and main requirement using LLM.

        Args:
            extracted_requirement_id: The ID of the extracted requirement
            requirement_id: The ID of the main requirement

        Returns:
            MergedRequirement: The merged requirement data

        Raises:
            HTTPException: If requirements not found
        """
        # Load the extracted requirement
        extracted_requirement_db = (
            self.requirement_repository.get_extracted_requirement_by_id(
                extracted_requirement_id
            )
        )
        if not extracted_requirement_db:
            raise HTTPException(
                status_code=404, detail="Extracted requirement not found"
            )

        # Get types for extracted requirement
        extracted_types = self.requirement_repository.get_extracted_requirement_types(
            extracted_requirement_id
        )

        # Load the main requirement
        requirement = self.requirement_repository.get(requirement_id)
        if not requirement:
            raise HTTPException(status_code=404, detail="Requirement not found")

        # Prepare the prompt
        prompt = """You are a requirements analyst merging two related requirements into one.

**CRITICAL CONSTRAINT**: The output must ONLY contain information present in the two input requirements below. Do NOT add, infer, assume, or elaborate beyond what is explicitly stated. If something is not mentioned in either input, it must NOT appear in the output.

**Field-by-field instructions:**

1. **description**: Merge ONLY the description fields from both inputs into coherent prose. Do not pull information from implementation_description into description. Do not add details not present in either description.

2. **types**: Return the union of both type lists, deduplicated. Do not invent new types.

3. **implementation_status**: Write an implementation status that aligns with the merged description. Valid values: "Implemented", "Planned", "To do", "Won't do".

4. **implementation_description**: Write an implementation description that aligns with the merged description. Use only information from the two input implementation_description fields.

5. **requirement_verification**: Write a verification method that aligns with the merged description. Use only information from the two input requirement_verification fields. Set to null if neither input has a verification method.

**Existing Requirement:**
- Description: {existing_description}
- Types: {existing_types}
- Implementation status: {existing_status}
- Implementation description: {existing_impl_desc}
- Requirement verification: {existing_verification}

**New Requirement to Integrate:**
- Description: {extracted_description}
- Types: {extracted_types}
- Implementation status: {extracted_status}
- Implementation description: {extracted_impl_desc}
- Requirement verification: {extracted_verification}

Return the merged requirement."""

        formatted_prompt = prompt.format(
            existing_description=requirement.description,
            existing_types=", ".join(requirement.types),
            existing_status=requirement.implementation_status,
            existing_impl_desc=requirement.implementation_description,
            existing_verification=requirement.requirement_verification
            or "Not specified",
            extracted_description=extracted_requirement_db.description,
            extracted_types=", ".join(extracted_types),
            extracted_status=extracted_requirement_db.implementation_status
            or "Not specified",
            extracted_impl_desc=extracted_requirement_db.implementation_description
            or "Not specified",
            extracted_verification=extracted_requirement_db.requirement_verification
            or "Not specified",
        )

        # Call the LLM
        try:
            agent = create_agent(
                "fast",
                system_prompt=formatted_prompt,
                output_type=crud_models.MergedRequirement,
            )
            result = await run_agent_with_retry(agent, "", deps=None)
            merged = result.output
        except Exception as e:
            log.error(f"Error processing merge request: {e}")
            raise HTTPException(
                status_code=500, detail="Error processing merge request"
            )

        return await self._validate_merged_requirement(
            merged, requirement, extracted_requirement_db
        )

    async def _validate_merged_requirement(
        self,
        merged: crud_models.MergedRequirement,
        requirement,
        extracted_requirement_db,
    ) -> crud_models.MergedRequirement:
        """Validate and auto-correct a merged requirement using extraction validators.

        Runs the same validation pipeline used during extraction:
        1. Quality check (with fix pass if rejected)
        2. Type consistency
        3. Implementation status/description
        4. Verification method (if either input has one)
        """
        organization_id = get_organization_id()

        # 1. Quality check — validate merged description is clear and self-contained
        try:
            quality_agent = create_quality_check_agent()
            quality_result = (
                await run_agent_with_retry(
                    quality_agent,
                    f"Validate this requirement description: {merged.description}",
                    deps=None,
                )
            ).output

            if quality_result.rejected:
                quality_fix_agent = create_quality_fix_agent()
                context = (
                    f"Existing requirement description: {requirement.description}\n"
                    f"New requirement description: {extracted_requirement_db.description}"
                )
                quality_fix_result = (
                    await run_agent_with_retry(
                        quality_fix_agent,
                        f"Fix this rejected requirement.\n\n"
                        f"Original: {merged.description}\n"
                        f"Rejection reason: {quality_result.rejection_reason}\n\n"
                        f"Source context:\n{context}",
                        deps=None,
                    )
                ).output

                if quality_fix_result.rejected:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Merged requirement failed quality validation: {quality_fix_result.rejection_reason}",
                    )
                merged.description = quality_fix_result.value
            else:
                merged.description = quality_result.value
        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Quality validation failed during merge: {e}")
            raise HTTPException(
                status_code=500,
                detail="Quality validation failed during merge",
            )

        # 2. Type consistency — auto-correct merged types
        try:
            existing_types = self.requirement_repository.get_distinct_types(
                organization_id
            )
            type_agent = create_type_consistency_agent(existing_types)
            type_result = (
                await run_agent_with_retry(
                    type_agent,
                    f"Requirement: {merged.description}\nAssigned Types: {merged.types}",
                    deps=None,
                )
            ).output
            merged.types = type_result.value
        except Exception as e:
            log.error(f"Type consistency validation failed during merge: {e}")
            raise HTTPException(
                status_code=500,
                detail="Type consistency validation failed during merge",
            )

        # 3. Implementation validation — auto-correct status and description
        try:
            (
                corrected_status,
                corrected_impl_desc,
                _changes,
                _reason,
            ) = await validate_implementation_inline(
                requirement_description=merged.description,
                requirement_types=merged.types,
                implementation_status=merged.implementation_status,
                implementation_description=merged.implementation_description,
                deps=None,
            )
            merged.implementation_status = corrected_status
            merged.implementation_description = corrected_impl_desc
        except Exception as e:
            log.error(f"Implementation validation failed during merge: {e}")
            raise HTTPException(
                status_code=500,
                detail="Implementation validation failed during merge",
            )

        # 4. Verification validation — auto-correct verification method
        has_input_verification = (
            requirement.requirement_verification
            or extracted_requirement_db.requirement_verification
        )
        if has_input_verification:
            try:
                (
                    corrected_verification,
                    _changes,
                    _reason,
                ) = await validate_verification_inline(
                    requirement_description=merged.description,
                    requirement_types=merged.types,
                    implementation_status=merged.implementation_status,
                    implementation_description=merged.implementation_description,
                    requirement_verification=merged.requirement_verification or "",
                )
                merged.requirement_verification = corrected_verification
            except Exception as e:
                log.error(f"Verification validation failed during merge: {e}")
                raise HTTPException(
                    status_code=500,
                    detail="Verification validation failed during merge",
                )

        return merged
