"""
Module for extracting questions from text using the AI framework workflow.
"""

import logging
from typing import List, Dict, Any, Callable

from ai_framework.workflow.question.extraction.orchestrator import (
    run_extraction_workflow,
)
from ai_framework.workflow.question.extraction.extraction_deps import (
    ExtractionDeps,
)
from questionnaire.extraction.intermediate_repository import (
    IntermediateQuestionRepository,
)
from s3_service import S3Service

logger = logging.getLogger(__name__)


class QuestionExtractor:
    def __init__(self, s3_service: S3Service):
        self.s3_service = s3_service

    async def extract_questions(
        self,
        questionnaire_id: str,
        file_name: str,
        s3_object_key: str,
        cancellation_check: Callable[[], None] | None = None,
    ) -> List[Dict[str, Any]]:
        """
        Extract questions from a questionnaire document using the AI agent workflow.

        Args:
            questionnaire_id: ID of the questionnaire being processed
            file_name: Original filename of the questionnaire
            s3_object_key: S3 object key for the questionnaire file
            cancellation_check: Optional callback that raises TaskCancelledException if cancelled

        Returns:
            List of dictionaries containing question text, e.g., [{"question": "What is...?"}]
        """
        logger.info(f"Starting question extraction for {file_name}")

        intermediate_repo = IntermediateQuestionRepository()
        deps = ExtractionDeps(
            s3_service=self.s3_service,
            questionnaire_id=questionnaire_id,
            file_name=file_name,
            s3_object_key=s3_object_key,
            intermediate_repo=intermediate_repo,
            cancellation_check=cancellation_check,
        )

        try:
            # Run the orchestrated extraction workflow
            await run_extraction_workflow(deps)

            # Retrieve all questions from the intermediate repository
            intermediate_questions = intermediate_repo.get_by_questionnaire(
                questionnaire_id
            )

            logger.info(
                f"Extracted {len(intermediate_questions)} questions via agent workflow"
            )

            # Convert to format expected by QuestionnaireService
            # [{"question": "...", "order": float}]
            return [
                {"question": q.question_text, "order": q.order}
                for q in intermediate_questions
            ]

        except Exception as e:
            logger.error(
                f"Error during question extraction workflow: {e}", exc_info=True
            )
            raise
