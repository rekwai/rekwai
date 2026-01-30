"""Dependencies configuration for extraction workflow agents.

This module defines ExtractionDeps, which combines file storage, context IDs,
and an in-memory repository for requirement extraction agents.
"""

from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable
from s3_service import S3Service

if TYPE_CHECKING:
    from requirements.document.intermediate_repository import (
        IntermediateExtractedRequirementRepository,
    )


@dataclass
class ExtractionDeps:
    """Dependencies for extraction workflow agents.

    Combines file storage, required IDs, and in-memory repository for extraction context.
    The intermediate_repo stores requirements in memory for the duration of the agent run.

    Attributes:
        s3_service: S3/MinIO service for file storage operations
        document_id: ID of the document being processed
        organization_id: ID of the organization owning the document
        document_name: Original filename of the document being processed
        product_id: ID of the product this document belongs to
        s3_object_key: S3 object key (path) for the document file
        intermediate_repo: In-memory repository for intermediate requirements during extraction
        existing_types: List of distinct requirement types from the final requirement_type table
        cancellation_check: Optional callback that raises TaskCancelledException if cancelled
        file_content: Pre-fetched document content for context injection (avoids read_file tool call)
        progress_callback: Optional callback to report progress (progress: 0.0-1.0, message: str)
    """

    s3_service: S3Service
    document_id: str
    organization_id: str
    document_name: str
    product_id: str
    s3_object_key: str
    intermediate_repo: "IntermediateExtractedRequirementRepository"
    existing_types: list[str]
    cancellation_check: Callable[[], None] | None = None
    file_content: str | None = None
    progress_callback: Callable[[float, str], None] | None = None
