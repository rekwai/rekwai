from typing import Optional
from sqlalchemy.engine import Engine

from questionnaire.models import QuestionAnswer

from ai_framework.workflow.question.answering.answering_deps import AnsweringDeps
from ai_framework.workflow.question.answering.agents.answer_agent import (
    create_answer_agent,
)


class RagQuestionAnsweringService:
    def __init__(
        self,
        db_engine: Optional[Engine] = None,
    ):
        self.db_engine = db_engine

    async def answer_question_with_rag(
        self,
        question_text: str,
        product_id: str,
        organization_id: str,
    ) -> QuestionAnswer:
        """
        Answer a question using the AI agent workflow (Question Answering POC).
        This replaces the old RAG implementation.
        """

        deps = AnsweringDeps(
            db_engine=self.db_engine,
            product_id=product_id,
            organization_id=organization_id,
            question_text=question_text,
        )

        agent = create_answer_agent()

        # Run agent
        result = await agent.run(
            f"Answer this question: {question_text}",
            deps=deps,
        )

        # Extract requirement keys from agent output
        source_requirement_keys = [
            ref.requirement_key for ref in result.output.requirements_referenced
        ]

        return QuestionAnswer(
            answer=result.output.explanation,
            answer_type=result.output.answer_type,
            context_sufficient=result.output.answer_type is not None,
            source_requirement_keys=source_requirement_keys,
        )
