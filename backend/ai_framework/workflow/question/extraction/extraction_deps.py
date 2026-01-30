"""Dependencies configuration for question extraction workflow agents.

This module defines ExtractionDeps, which combines file storage, context IDs,
and an in-memory repository for question extraction agents.
"""

from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable
from s3_service import S3Service

if TYPE_CHECKING:
    from questionnaire.extraction.intermediate_repository import (
        IntermediateQuestionRepository,
    )


@dataclass
class ExtractionDeps:
    """Dependencies for question extraction workflow agents.

    Combines file storage, required IDs, and in-memory repository for extraction context.
    The intermediate_repo stores questions in memory for the duration of the agent run.

    Attributes:
        s3_service: S3/MinIO service for file storage operations
        questionnaire_id: ID of the questionnaire being processed
        file_name: Original filename of the questionnaire (from QuestionnaireDB.file_name)
        s3_object_key: S3 object key (path) for the questionnaire file
        intermediate_repo: In-memory repository for intermediate questions during extraction
        cancellation_check: Optional callback that raises TaskCancelledException if cancelled
        file_content: Pre-fetched questionnaire content for context injection (avoids read_file tool call)
    """

    s3_service: S3Service
    questionnaire_id: str
    file_name: str
    s3_object_key: str
    intermediate_repo: "IntermediateQuestionRepository"
    cancellation_check: Callable[[], None] | None = None
    file_content: str | None = None
