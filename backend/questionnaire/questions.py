"""
Question-specific services for the questionnaire module.
"""

import logging
from uuid import UUID

from fastapi import HTTPException

from . import models
from .repository import QuestionnaireRepository
from requirements.question_link.repository import RequirementQuestionLinkRepository
from requirements.crud.comparison import RequirementComparisonService
from requirements.crud.models import SimilarRequirementWithLLM
from ai_framework.agent import create_agent
from auth.org_context import get_organization_id

logger = logging.getLogger(__name__)


class QuestionService:
    def __init__(
        self,
        repository: QuestionnaireRepository,
        link_repository: RequirementQuestionLinkRepository,
        comparison_service: RequirementComparisonService,
    ):
        self.repository = repository
        self.link_repository = link_repository
        self.comparison_service = comparison_service

    def get_questions_by_questionnaire_id(
        self, questionnaire_id: str
    ) -> list[models.QuestionnaireQuestion]:
        questions = self.repository.get_questions_by_questionnaire_id(
            str(questionnaire_id)
        )
        if not questions:
            # We return empty list instead of 404 if no questions found,
            # as it's a valid state for a new questionnaire or one where all questions were deleted
            return []

        return [
            models.QuestionnaireQuestion.model_validate(question)
            for question in questions
        ]

    def get_questions_by_questionnaire_key(
        self, questionnaire_key: str
    ) -> list[models.QuestionnaireQuestion]:
        organization_id = get_organization_id()
        db_questionnaire = self.repository.get_questionnaire_by_key_or_raise(
            questionnaire_key, organization_id
        )
        return self.get_questions_by_questionnaire_id(str(db_questionnaire.id))

    def review_question(
        self, question_id: UUID, review_input: models.QuestionReviewInput
    ) -> models.QuestionnaireQuestion:
        db_question = self.repository.update_question_review(question_id, review_input)
        if not db_question:
            raise HTTPException(
                status_code=404, detail="Questionnaire question not found"
            )
        return models.QuestionnaireQuestion.model_validate(db_question)

    def delete_question(self, question_id: UUID) -> models.QuestionnaireQuestion:
        # First delete any links to requirements
        links = self.link_repository.get_links_for_question(str(question_id))
        for link in links:
            self.link_repository.delete_link(link.requirement_id, link.question_id)

        db_question = self.repository.delete_question(question_id)
        if not db_question:
            raise HTTPException(
                status_code=404, detail="Questionnaire question not found"
            )
        return models.QuestionnaireQuestion.model_validate(db_question)

    def create_question(
        self, question_create: models.QuestionnaireQuestionCreate
    ) -> models.QuestionnaireQuestion:
        """Create a new questionnaire question."""
        db_question = self.repository.create_question(question_create)
        return models.QuestionnaireQuestion.model_validate(db_question)

    def update_question(
        self, question_id: UUID, update_data: models.QuestionnaireQuestionUpdate
    ) -> models.QuestionnaireQuestion:
        """Update a questionnaire question."""
        db_question = self.repository.update_question(str(question_id), update_data)
        if not db_question:
            raise HTTPException(
                status_code=404, detail=f"Question with id {question_id} not found."
            )
        return models.QuestionnaireQuestion.model_validate(db_question)

    def get_requirement_links(self, question_id: str) -> list[str]:
        """Get requirement links for a specific question."""
        requirement_ids = self.link_repository.get_requirement_ids_for_question(
            question_id
        )
        return requirement_ids

    def save_question_answer(
        self, question_id: str, answer: str, answer_type: str = None
    ) -> models.QuestionnaireQuestion:
        """Save an answer to a specific question."""
        db_question = self.repository.save_question_answer(
            question_id, answer, answer_type
        )
        if not db_question:
            raise HTTPException(
                status_code=404, detail="Questionnaire question not found"
            )
        return models.QuestionnaireQuestion.model_validate(db_question)

    async def find_similar_requirements_for_question(
        self, question_id: str, limit: int = 3, filter_reqs: list[str] | None = None
    ) -> list[SimilarRequirementWithLLM]:
        """Find similar requirements for a given questionnaire question using embeddings and LLM comparison."""
        question = self.repository.get_question_by_id(question_id)
        if not question:
            raise HTTPException(
                status_code=404,
                detail=f"Question with id {question_id} not found.",
            )

        # Fail fast: validate question text before fetching questionnaire
        if not question.question_text or not question.question_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Question does not have text content.",
            )

        # Get the questionnaire to find the product_id
        questionnaire = self.repository.get_questionnaire_by_id(
            str(question.questionnaire_id)
        )
        if not questionnaire:
            raise HTTPException(
                status_code=404,
                detail=f"Questionnaire with id {question.questionnaire_id} not found.",
            )

        return (
            await self.comparison_service.find_similar_requirements_with_llm_comparison(
                text_to_embed=str(question.question_text),
                doc_req_text=str(question.question_text),
                product_id=str(questionnaire.product_id),
                limit=limit,
                filter_reqs=filter_reqs or [],
            )
        )

    async def generate_requirement_from_question(
        self, question_id: str
    ) -> models.QuestionGeneratedRequirement:
        """Generate a requirement from a questionnaire question using AI."""

        question = self.repository.get_question_by_id(question_id)
        if not question:
            raise HTTPException(
                status_code=404,
                detail=f"Question with id {question_id} not found.",
            )

        prompt = f"""Create a new requirement based on the following questionnaire question.
Generate appropriate content for all requirement fields based on the question context.

Question: {question.question_text}

Generate a requirement with the following fields as a JSON object:
- description: [clear requirement description derived from the question]
- types: [array of requirement type categories, e.g., ["functional", "security"]]
- implementation_status: [current status: "To do", "Planned", "Implemented", or "Won't do"]
- implementation_description: [how this would be implemented]
- requirement_verification: [how to verify this requirement is met]

Return only valid JSON matching the exact field names above."""

        try:
            agent = create_agent(
                "fast",
                system_prompt=prompt,
                output_type=models.QuestionGeneratedRequirement,
            )
            result = await agent.run("")
            return result.output

        except Exception as e:
            logger.error(
                f"Error generating requirement from question {question_id}: {e}"
            )
            raise HTTPException(
                status_code=500, detail="Failed to generate requirement from question."
            ) from e
