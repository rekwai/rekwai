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
from auth.org_context import get_organization_id
from s3_service import S3Service
from ai_framework.agent import create_agent

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
        prompt = """You are a requirements analyst. Synthesize the following two related requirements into a single, comprehensive requirement.

**Instructions:**
- Write a NEW unified description that integrates the content from both requirements
- Do NOT simply concatenate or list bullet points from both - actually rewrite into coherent prose
- Combine overlapping information without redundancy
- Preserve all unique details from both requirements
- The result should read as a single, well-written requirement - not as a merge of two
- Keep the same level of technical specificity

**Existing Requirement:**
- Description: {existing_description}
- Types: {existing_types}
- Implementation status: {existing_status}
- Implementation description: {existing_impl_desc}

**New Requirement to Integrate:**
- Description: {extracted_description}
- Types: {extracted_types}
- Implementation status: {extracted_status}
- Implementation description: {extracted_impl_desc}

Return the synthesized requirement."""

        formatted_prompt = prompt.format(
            existing_description=requirement.description,
            existing_types=", ".join(requirement.types),
            existing_status=requirement.implementation_status,
            existing_impl_desc=requirement.implementation_description,
            extracted_description=extracted_requirement_db.description,
            extracted_types=", ".join(extracted_types),
            extracted_status=extracted_requirement_db.implementation_status
            or "Not specified",
            extracted_impl_desc=extracted_requirement_db.implementation_description
            or "Not specified",
        )

        # Call the LLM
        try:
            agent = create_agent(
                "fast",
                system_prompt=formatted_prompt,
                output_type=crud_models.MergedRequirement,
            )
            result = await agent.run("")
            return result.output
        except Exception as e:
            log.error(f"Error processing merge request: {e}")
            raise HTTPException(
                status_code=500, detail="Error processing merge request"
            )
