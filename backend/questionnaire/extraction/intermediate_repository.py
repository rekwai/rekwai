"""Repository for intermediate questionnaire question in-memory operations during agent-to-agent extraction."""

from typing import Optional, List, Dict, Tuple
from datetime import datetime, timezone

from questionnaire.models import (
    IntermediateQuestionCreate,
    IntermediateQuestionUpdate,
    IntermediateQuestionDto,
)


class IntermediateQuestionRepository:
    """Repository for handling intermediate questionnaire question in-memory operations.

    This repository stores questions in memory during the extraction workflow,
    avoiding database round-trips and improving performance. Questions are keyed
    by (questionnaire_id, order) tuple for fast lookup.
    """

    def __init__(self):
        """Initialize the in-memory repository with empty storage."""
        # Storage: key is (questionnaire_id, order), value is dict with all question data
        self.storage: Dict[Tuple[str, float], dict] = {}

    def _build_dto(self, question_data: dict) -> IntermediateQuestionDto:
        """Helper method to build DTO from in-memory question data.

        Note: The DTO exposes `order` (float) instead of internal keys to AI agents
        to reduce token usage and improve AI reasoning.

        The questionnaire_id is intentionally excluded from the DTO to reduce token usage -
        it's available in the context (ExtractionDeps).
        """
        return IntermediateQuestionDto(
            order=question_data["order"],
            question_text=question_data["question_text"],
            created_at=question_data["created_at"],
        )

    def create(
        self,
        question_data: IntermediateQuestionCreate,
        questionnaire_id: str,
        order: float,
    ) -> IntermediateQuestionDto:
        """Create a new intermediate questionnaire question record in memory.

        Args:
            question_data: The question data to create (without metadata fields)
            questionnaire_id: The questionnaire ID this question belongs to
            order: The order value (e.g., 1.0, 2.5, 3.0)

        Returns:
            The created question DTO (without questionnaire_id to reduce token usage)

        Raises:
            ValueError: If the order value already exists for this questionnaire
        """
        key = (questionnaire_id, order)

        if key in self.storage:
            raise ValueError(
                f"Question with order {order} already exists for questionnaire {questionnaire_id}"
            )

        # Store question data in memory
        question_dict = {
            "questionnaire_id": questionnaire_id,
            "order": order,
            "question_text": question_data.question_text,
            "created_at": datetime.now(timezone.utc),
        }

        self.storage[key] = question_dict
        return self._build_dto(question_dict)

    def get_by_order(
        self, questionnaire_id: str, order: float
    ) -> Optional[IntermediateQuestionDto]:
        """Get an intermediate question by its order number.

        This is the AI-friendly method for retrieving questions by their sequential order.

        Args:
            questionnaire_id: The questionnaire ID
            order: The order number (e.g., 1.0, 2.5, 3.0)

        Returns:
            The question DTO if found, None otherwise
        """
        key = (questionnaire_id, order)
        question_data = self.storage.get(key)

        if question_data is None:
            return None

        return self._build_dto(question_data)

    def get_by_questionnaire(
        self, questionnaire_id: str
    ) -> List[IntermediateQuestionDto]:
        """Get all intermediate questions for a specific questionnaire.

        Questions are returned ordered by their `order` field (ascending),
        so the AI sees them in extraction sequence (1.0, 2.0, 2.5, 3.0, ...).

        Args:
            questionnaire_id: The questionnaire ID

        Returns:
            List of question DTOs ordered by order field
        """
        # Filter questions for this questionnaire and sort by order
        questions = [
            question_data
            for (q_id, _), question_data in self.storage.items()
            if q_id == questionnaire_id
        ]

        # Sort by order field
        questions.sort(key=lambda q: q["order"])

        return [self._build_dto(q) for q in questions]

    def update_by_order(
        self,
        questionnaire_id: str,
        order: float,
        update_data: IntermediateQuestionUpdate,
    ) -> Optional[IntermediateQuestionDto]:
        """Update an intermediate question by its order number.

        Args:
            questionnaire_id: The questionnaire ID
            order: The order number (e.g., 1.0, 2.5, 3.0)
            update_data: The update data

        Returns:
            The updated question DTO if found, None otherwise
        """
        key = (questionnaire_id, order)
        question_data = self.storage.get(key)

        if question_data is None:
            return None

        # Update fields from update_data (exclude None values)
        update_dict = update_data.model_dump(exclude_unset=True)

        for field, value in update_dict.items():
            question_data[field] = value

        return self._build_dto(question_data)

    def delete_by_order(self, questionnaire_id: str, order: float) -> bool:
        """Delete an intermediate question by its order number.

        This is the AI-friendly method for deleting questions by their sequential order.

        Args:
            questionnaire_id: The questionnaire ID
            order: The order number (e.g., 1.0, 2.5, 3.0)

        Returns:
            True if the question was deleted, False if not found
        """
        key = (questionnaire_id, order)

        if key not in self.storage:
            return False

        del self.storage[key]
        return True

    def delete_by_questionnaire(self, questionnaire_id: str) -> int:
        """Delete all intermediate questions for a specific questionnaire.

        Args:
            questionnaire_id: The questionnaire ID

        Returns:
            Number of questions deleted
        """
        keys_to_delete = [
            key for key in self.storage.keys() if key[0] == questionnaire_id
        ]

        for key in keys_to_delete:
            del self.storage[key]

        return len(keys_to_delete)
