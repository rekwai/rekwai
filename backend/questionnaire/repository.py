"""
Repository for questionnaire and question data access.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from product.tables import ProductDB
from requirements.crud.tables import RequirementDB
from client.tables import ClientDB
from . import tables, models


class QuestionnaireRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_requirements_by_ids(
        self, requirement_ids: List[str]
    ) -> List[RequirementDB]:
        if not requirement_ids:
            return []
        return (
            self.db.query(RequirementDB)
            .filter(RequirementDB.id.in_(requirement_ids))
            .all()
        )

    def get_requirement_ids_by_keys(self, requirement_keys: List[str]) -> List[str]:
        """Get requirement IDs from requirement keys."""
        if not requirement_keys:
            return []
        results = (
            self.db.query(RequirementDB.id)
            .filter(RequirementDB.requirement_key.in_(requirement_keys))
            .all()
        )
        return [str(r.id) for r in results]

    def create_questionnaire(
        self,
        file_name: str,
        file_type: str,
        s3_object_key: str,
        client_id: str,
        product_id: str,
        organization_id: str,
        key: str,
    ) -> tables.QuestionnaireDB:
        db_questionnaire = tables.QuestionnaireDB(
            file_name=file_name,
            file_type=file_type,
            s3_object_key=s3_object_key,
            upload_status="uploaded",
            client_id=client_id,
            product_id=product_id,
            organization_id=organization_id,
            key=key,
        )
        self.db.add(db_questionnaire)
        self.db.commit()
        self.db.refresh(db_questionnaire)
        return db_questionnaire

    def get_questionnaire_by_id(
        self, questionnaire_id: str
    ) -> Optional[tables.QuestionnaireDB]:
        return (
            self.db.query(tables.QuestionnaireDB)
            .filter(tables.QuestionnaireDB.id == questionnaire_id)
            .first()
        )

    def get_questionnaire_by_key(
        self, questionnaire_key: str, organization_id: str
    ) -> Optional[tables.QuestionnaireDB]:
        """Get questionnaire by its key within an organization."""
        return (
            self.db.query(tables.QuestionnaireDB)
            .filter(
                tables.QuestionnaireDB.key == questionnaire_key,
                tables.QuestionnaireDB.organization_id == organization_id,
            )
            .first()
        )

    def get_questionnaire_by_key_or_raise(
        self, questionnaire_key: str, organization_id: str
    ) -> tables.QuestionnaireDB:
        """Get questionnaire by its key within an organization or raise HTTPException if not found."""
        db_questionnaire = self.get_questionnaire_by_key(
            questionnaire_key, organization_id
        )
        if not db_questionnaire:
            raise HTTPException(
                status_code=404,
                detail=f"Questionnaire with key {questionnaire_key} not found.",
            )
        return db_questionnaire

    def update_questionnaire_status(
        self, questionnaire_id: str, status: str
    ) -> Optional[tables.QuestionnaireDB]:
        """Update questionnaire upload status.

        Returns None if questionnaire not found.
        """
        db_questionnaire = self.get_questionnaire_by_id(questionnaire_id)
        if db_questionnaire:
            db_questionnaire.upload_status = status
            self.db.commit()
            self.db.refresh(db_questionnaire)
        return db_questionnaire

    def _build_questionnaire_summary_query(self):
        """Build base query for questionnaire summary with question counts."""
        return (
            self.db.query(
                tables.QuestionnaireDB.id,
                tables.QuestionnaireDB.key,
                ClientDB.name,
                tables.QuestionnaireDB.file_name,
                tables.QuestionnaireDB.upload_timestamp,
                func.count(tables.QuestionnaireQuestionDB.id).label("total_questions"),
                func.sum(
                    case(
                        (
                            tables.QuestionnaireQuestionDB.generated_answer.isnot(None),
                            1,
                        ),
                        else_=0,
                    )
                ).label("answered_questions"),
            )
            .join(
                ClientDB,
                tables.QuestionnaireDB.client_id == ClientDB.id,
            )
            .outerjoin(
                tables.QuestionnaireQuestionDB,
                tables.QuestionnaireDB.id
                == tables.QuestionnaireQuestionDB.questionnaire_id,
            )
            .group_by(
                tables.QuestionnaireDB.id,
                tables.QuestionnaireDB.key,
                ClientDB.name,
                tables.QuestionnaireDB.file_name,
                tables.QuestionnaireDB.upload_timestamp,
            )
        )

    def _row_to_summary(self, row) -> models.QuestionnaireSummaryData:
        """Convert a query result row to QuestionnaireSummaryData."""
        (
            id,
            key,
            client_name,
            file_name,
            uploaded_at,
            total_questions,
            answered_questions,
        ) = row
        return models.QuestionnaireSummaryData(
            id=id,
            key=key,
            client_name=client_name or "Unknown Client",
            file_name=file_name,
            uploaded_at=uploaded_at,
            total_questions=total_questions or 0,
            answered_questions=answered_questions or 0,
        )

    def list_questionnaires_for_product(
        self, product_id: str, organization_id: str
    ) -> List[models.QuestionnaireSummaryData]:
        results = (
            self._build_questionnaire_summary_query()
            .filter(tables.QuestionnaireDB.product_id == product_id)
            .filter(tables.QuestionnaireDB.organization_id == organization_id)
            .order_by(tables.QuestionnaireDB.upload_timestamp)
            .all()
        )
        return [self._row_to_summary(row) for row in results]

    def get_questionnaire_summary(
        self, questionnaire_id: str
    ) -> Optional[models.QuestionnaireSummaryData]:
        summary_data = (
            self._build_questionnaire_summary_query()
            .filter(tables.QuestionnaireDB.id == questionnaire_id)
            .first()
        )

        if not summary_data:
            return None

        return self._row_to_summary(summary_data)

    def get_questionnaire_details(
        self, questionnaire_id: str
    ) -> Optional[models.QuestionnaireDetails]:
        """Get questionnaire details including product_id."""
        db_questionnaire = self.get_questionnaire_by_id(questionnaire_id)
        if not db_questionnaire:
            return None

        # Get client name from client table
        client = (
            self.db.query(ClientDB)
            .filter(ClientDB.id == db_questionnaire.client_id)
            .first()
        )
        client_name = client.name if client else "Unknown Client"

        return models.QuestionnaireDetails(
            id=db_questionnaire.id,
            key=db_questionnaire.key,
            product_id=db_questionnaire.product_id,
            client_name=client_name,
            uploaded_at=db_questionnaire.upload_timestamp,
        )

    def delete_questionnaire(self, questionnaire_id: str):
        self.db.query(tables.QuestionnaireQuestionDB).filter(
            tables.QuestionnaireQuestionDB.questionnaire_id == questionnaire_id
        ).delete()
        self.db.query(tables.QuestionnaireDB).filter(
            tables.QuestionnaireDB.id == questionnaire_id
        ).delete()
        self.db.commit()

    def get_product_for_questionnaire(
        self, questionnaire_id: str
    ) -> Optional[ProductDB]:
        questionnaire = self.get_questionnaire_by_id(questionnaire_id)
        if questionnaire:
            return (
                self.db.query(ProductDB)
                .filter(ProductDB.id == questionnaire.product_id)
                .first()
            )
        return None

    def create_question(
        self, question: models.QuestionnaireQuestionCreate
    ) -> tables.QuestionnaireQuestionDB:
        db_question = tables.QuestionnaireQuestionDB(
            questionnaire_id=question.questionnaire_id,
            question_text=question.question_text,
            order=question.order,
        )

        # Set answer and status if answer was generated
        if question.answer:
            db_question.generated_answer = question.answer
            db_question.status = "answered"
            db_question.generation_timestamp = func.now()

        # Set answer_type if provided
        if question.answer_type:
            db_question.answer_type = question.answer_type

        self.db.add(db_question)
        self.db.commit()
        self.db.refresh(db_question)
        return db_question

    def get_question_by_id(
        self, question_id: str
    ) -> Optional[tables.QuestionnaireQuestionDB]:
        return (
            self.db.query(tables.QuestionnaireQuestionDB)
            .filter(tables.QuestionnaireQuestionDB.id == question_id)
            .first()
        )

    def get_questions_by_questionnaire_id(
        self, questionnaire_id: str
    ) -> List[models.QuestionnaireQuestion]:
        db_questions = (
            self.db.query(tables.QuestionnaireQuestionDB)
            .filter(tables.QuestionnaireQuestionDB.questionnaire_id == questionnaire_id)
            .order_by(tables.QuestionnaireQuestionDB.order)
            .all()
        )
        return [models.QuestionnaireQuestion.model_validate(q) for q in db_questions]

    def save_question_answer(
        self, question_id: str, answer: str, answer_type: str = None
    ) -> Optional[tables.QuestionnaireQuestionDB]:
        """Save an answer to a specific question."""
        db_question = self.get_question_by_id(question_id)
        if db_question:
            db_question.generated_answer = answer
            db_question.status = "answered"
            db_question.generation_timestamp = func.now()
            db_question.answer_type = answer_type
            self.db.commit()
            self.db.refresh(db_question)
        return db_question

    def update_question_review(
        self, question_id: UUID, review_data: models.QuestionReviewInput
    ) -> Optional[tables.QuestionnaireQuestionDB]:
        db_question = self.get_question_by_id(question_id)
        if not db_question:
            return None

        db_question.review_timestamp = func.now()
        db_question.review_status = tables.ReviewStatusEnum(review_data.review_status)

        if review_data.review_status == tables.ReviewStatusEnum.approved:
            db_question.status = "reviewed"
            db_question.reviewed_answer = db_question.generated_answer
        elif review_data.review_status == tables.ReviewStatusEnum.modified:
            db_question.status = "reviewed"
            db_question.reviewed_answer = review_data.reviewed_answer
        elif review_data.review_status == tables.ReviewStatusEnum.rejected:
            db_question.status = "rejected"
            db_question.reviewed_answer = None

        self.db.commit()
        self.db.refresh(db_question)
        return db_question

    def delete_question(
        self, question_id: UUID
    ) -> Optional[tables.QuestionnaireQuestionDB]:
        db_question = self.get_question_by_id(question_id)
        if db_question:
            self.db.delete(db_question)
            self.db.commit()
        return db_question
