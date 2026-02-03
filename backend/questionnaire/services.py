"""
Business logic services for questionnaire operations.
"""

import asyncio
import logging
import uuid6
from collections import Counter
from pathlib import Path
from typing import Optional, TYPE_CHECKING
from io import BytesIO

from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from ai.extract_markdown import extract_text_from_file
from auth.org_context import get_organization_id
from questionnaire.extraction.extract_questions import QuestionExtractor
from s3_service import S3Service
from async_tasks.services import AsyncTasksService, TaskStatus
from async_tasks.exceptions import TaskCancelledException
from requirements.question_link.repository import RequirementQuestionLinkRepository
from . import models
from .repository import QuestionnaireRepository
from .rag.answer_questions import RagQuestionAnsweringService
from .export.renderer import (
    QuestionnairePdfData,
    QAItem,
    render_questionnaire_pdf,
    LinkedRequirement,
)

if TYPE_CHECKING:
    from client.services import ClientService
    from product.services import ProductService

logger = logging.getLogger(__name__)

ALLOWED_QUESTIONNAIRE_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".xls", ".xlsx"}


class QuestionnaireService:
    def __init__(
        self,
        repository: QuestionnaireRepository,
        question_extractor: QuestionExtractor,
        s3_service: S3Service,
        async_tasks_service: AsyncTasksService,
        rag_service: RagQuestionAnsweringService,
        link_repository: RequirementQuestionLinkRepository,
        client_service: "ClientService",
        product_service: "ProductService",
    ):
        self.repository = repository
        self.question_extractor = question_extractor
        self.s3_service = s3_service
        self.async_tasks_service = async_tasks_service
        self.rag_service = rag_service
        self.link_repository = link_repository
        self.client_service = client_service
        self.product_service = product_service

    def export_questionnaire_pdf(
        self, questionnaire_id: str, include_linked_requirements: bool = False
    ) -> bytes:
        """Generate a PDF export for the questionnaire with its questions and answers.

        If include_linked_requirements is True, also load and include requirement links per question.
        """
        # Load questionnaire summary
        summary = self.repository.get_questionnaire_summary(questionnaire_id)
        if not summary:
            raise HTTPException(status_code=404, detail="Questionnaire not found")

        # Load product name
        product = self.repository.get_product_for_questionnaire(questionnaire_id)
        product_name = product.name if product else None

        # Load questions
        questions = self.repository.get_questions_by_questionnaire_id(questionnaire_id)
        qa_items: list[QAItem] = []
        for idx, q in enumerate(questions, start=1):
            answer = q.reviewed_answer or q.generated_answer

            linked_reqs = None
            if include_linked_requirements:
                req_ids = self.link_repository.get_requirement_ids_for_question(q.id)
                reqs = self.repository.get_requirements_by_ids(req_ids)
                linked_reqs = [
                    LinkedRequirement(key=r.requirement_key, description=r.description)
                    for r in reqs
                ]

            qa_items.append(
                QAItem(
                    index=idx,
                    question=q.question_text,
                    answer=answer,
                    linked_requirements=linked_reqs,
                )
            )

        data = QuestionnairePdfData(
            id=summary.id,
            client_name=summary.client_name,
            file_name=summary.file_name,
            uploaded_at=summary.uploaded_at,
            total_questions=summary.total_questions,
            answered_questions=summary.answered_questions,
            product_name=product_name,
            qa=qa_items,
            include_linked_requirements=include_linked_requirements,
        )

        pdf_bytes = render_questionnaire_pdf(data)
        return pdf_bytes

    async def _cleanup_partial_questionnaire_upload(
        self,
        s3_keys: list[str],
        questionnaire_id: str | None,
        question_ids: list[str],
    ) -> None:
        """
        Clean up partial data from a failed or cancelled questionnaire upload.

        Args:
            s3_keys: List of S3 object keys to delete
            questionnaire_id: Questionnaire ID to delete (if created)
            question_ids: List of question IDs to delete
        """
        logger.info(
            f"Cleaning up partial questionnaire upload: s3_keys={len(s3_keys)}, "
            f"questionnaire_id={questionnaire_id}, questions={len(question_ids)}"
        )

        # Delete question-requirement links and questions
        for question_id in question_ids:
            try:
                links = self.link_repository.get_links_for_question(question_id)
                for link in links:
                    self.link_repository.delete_link(
                        link.requirement_id, link.question_id
                    )
                self.repository.delete_question(question_id)
            except Exception as e:
                logger.warning(f"Error cleaning up question {question_id}: {e}")

        # Delete questionnaire record
        if questionnaire_id:
            try:
                self.repository.delete_questionnaire(questionnaire_id)
            except Exception as e:
                logger.warning(
                    f"Error cleaning up questionnaire {questionnaire_id}: {e}"
                )

        # Delete S3 files
        for s3_key in s3_keys:
            try:
                await self.s3_service.delete_file(
                    S3Service.UPLOAD_DOCUMENTS_BUCKET, s3_key
                )
            except Exception as e:
                logger.warning(f"Error cleaning up S3 file {s3_key}: {e}")

    async def upload_and_process_questionnaire_async(
        self,
        file_name: str,
        file_content: bytes,
        client_id: str,
        product_id: str,
        task_id: str,
    ):
        """Upload and process questionnaire document asynchronously, extracting questions."""
        original_filename = file_name
        if not original_filename:
            self.async_tasks_service.update_task(
                task_id, status=TaskStatus.FAILED, error="No filename provided"
            )
            raise HTTPException(status_code=400, detail="No filename provided.")

        file_extension = Path(original_filename).suffix.lower()

        self.async_tasks_service.update_task(
            task_id,
            status=TaskStatus.RUNNING,
            progress=0.1,
            message="Starting questionnaire processing",
        )

        if file_extension not in ALLOWED_QUESTIONNAIRE_EXTENSIONS:
            error_msg = f"Invalid file type '{file_extension}'. Allowed types: {', '.join(ALLOWED_QUESTIONNAIRE_EXTENSIONS)}"
            self.async_tasks_service.update_task(
                task_id,
                status=TaskStatus.FAILED,
                error=error_msg,
            )
            raise HTTPException(status_code=400, detail=error_msg)

        organization_id = get_organization_id()
        unique_filename = f"{uuid6.uuid7()}{file_extension}"  # using time-ordered uuid7

        # Track created resources for cleanup
        created_s3_keys: list[str] = []
        created_questionnaire_id: str | None = None
        created_question_ids: list[str] = []
        extraction_complete = False  # Set to True after questions are saved to DB

        try:
            if not file_content:
                self.async_tasks_service.update_task(
                    task_id, status=TaskStatus.FAILED, error="Uploaded file is empty"
                )
                raise HTTPException(status_code=400, detail="Uploaded file is empty.")

            s3_object_key = (
                f"{organization_id}/questionnaire_documents/{unique_filename}"
            )
            await self.s3_service.save_file(
                bucket_name=self.s3_service.UPLOAD_DOCUMENTS_BUCKET,
                object_key=s3_object_key,
                file_content=file_content,
            )
            created_s3_keys.append(s3_object_key)

            # Check for cancellation after S3 upload
            self.async_tasks_service.check_cancellation(task_id)

            self.async_tasks_service.update_task(
                task_id, progress=0.2, message="Creating questionnaire record"
            )

            # Generate questionnaire key
            row = self.product_service.repository.increment_and_get_questionnaire_key(
                product_id
            )
            if not row:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid product_id for questionnaire creation",
                )
            current_number, product_key = row

            # Get client to build the full questionnaire key
            client = self.client_service.get_client(client_id)
            if not client:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid client_id for questionnaire creation",
                )

            questionnaire_key = f"{product_key}-{client.key}-{current_number}"

            db_questionnaire = self.repository.create_questionnaire(
                file_name=original_filename,
                file_type=file_extension,
                s3_object_key=s3_object_key,
                client_id=client_id,
                product_id=product_id,
                organization_id=organization_id,
                key=questionnaire_key,
            )
            created_questionnaire_id = str(db_questionnaire.id)

            # Check for cancellation after questionnaire creation
            self.async_tasks_service.check_cancellation(task_id)

            self.async_tasks_service.update_task(
                task_id, progress=0.4, message="Extracting text from document"
            )

            extracted_text = await extract_text_from_file(
                file_content, original_filename
            )
            if not extracted_text or not extracted_text.strip():
                self.repository.update_questionnaire_status(
                    db_questionnaire.id, "text_extraction_failed"
                )
                self.async_tasks_service.update_task(
                    task_id,
                    status=TaskStatus.COMPLETED,
                    progress=1.0,
                    message="No text content found in document",
                    entity_id=str(db_questionnaire.id),
                )
                return

            # Check for cancellation after text extraction
            self.async_tasks_service.check_cancellation(task_id)

            self.repository.update_questionnaire_status(
                db_questionnaire.id, "text_extracted"
            )

            # Save extracted text to S3 for the AI agent to read
            text_s3_key = f"{s3_object_key}.md"
            await self.s3_service.save_file(
                bucket_name=self.s3_service.UPLOAD_DOCUMENTS_BUCKET,
                object_key=text_s3_key,
                file_content=extracted_text.encode("utf-8"),
            )
            created_s3_keys.append(text_s3_key)

            self.async_tasks_service.update_task(
                task_id, progress=0.6, message="Extracting questions using AI"
            )

            # Check for cancellation before AI extraction
            self.async_tasks_service.check_cancellation(task_id)

            # Create cancellation callback for the extraction workflow
            def cancellation_check():
                self.async_tasks_service.check_cancellation(task_id)

            extracted_questions_data = await self.question_extractor.extract_questions(
                questionnaire_id=str(db_questionnaire.id),
                file_name=original_filename,
                s3_object_key=text_s3_key,
                cancellation_check=cancellation_check,
            )
            if not extracted_questions_data:
                self.repository.update_questionnaire_status(
                    db_questionnaire.id, "question_extraction_failed"
                )
                self.async_tasks_service.update_task(
                    task_id,
                    status=TaskStatus.COMPLETED,
                    progress=1.0,
                    message="No questions extracted from text",
                    entity_id=str(db_questionnaire.id),
                )
                return

            # Check for cancellation after question extraction
            self.async_tasks_service.check_cancellation(task_id)

            # Validate order values before expensive answer generation
            orders = [q.get("order") for q in extracted_questions_data]
            missing = [i for i, o in enumerate(orders) if o is None]
            if missing:
                raise HTTPException(
                    status_code=422,
                    detail=f"Questions at indices {missing} are missing an 'order' value",
                )
            order_counts = Counter(orders)
            duplicates = {o for o, count in order_counts.items() if count > 1}
            if duplicates:
                raise HTTPException(
                    status_code=422,
                    detail=f"Duplicate question order values detected: {duplicates}",
                )

            questions_with_data = await self._generate_answers_for_questions(
                extracted_questions_data, product_id, task_id, organization_id
            )

            # Check for cancellation after answer generation
            self.async_tasks_service.check_cancellation(task_id)

            self.async_tasks_service.update_task(
                task_id, progress=0.8, message="Saving extracted questions"
            )

            saved_questions_count, saved_question_ids = (
                self._save_questions_to_database(questions_with_data, db_questionnaire)
            )
            created_question_ids.extend(saved_question_ids)

            # Mark extraction as complete - failures after this point should NOT cleanup
            extraction_complete = True

            self.repository.update_questionnaire_status(
                db_questionnaire.id, "completed"
            )

            self.async_tasks_service.update_task(
                task_id,
                status=TaskStatus.COMPLETED,
                progress=1.0,
                message=f"Successfully extracted and saved {saved_questions_count} questions",
                entity_id=db_questionnaire.key,
            )

        except TaskCancelledException:
            logger.info(
                f"Task {task_id} was cancelled (extraction_complete={extraction_complete})"
            )
            if self.async_tasks_service.should_cleanup_cancelled_task(
                task_id, extraction_complete
            ):
                logger.info(f"Cleaning up partial data for task {task_id}...")
                await self._cleanup_partial_questionnaire_upload(
                    s3_keys=created_s3_keys,
                    questionnaire_id=created_questionnaire_id,
                    question_ids=created_question_ids,
                )
            self.async_tasks_service.finalize_cancellation(
                task_id, message="Questionnaire upload cancelled"
            )
            raise
        except HTTPException:
            # Only clean up on HTTP exceptions if extraction not complete
            if not extraction_complete:
                logger.info(f"HTTP error during task {task_id}, cleaning up...")
                await self._cleanup_partial_questionnaire_upload(
                    s3_keys=created_s3_keys,
                    questionnaire_id=created_questionnaire_id,
                    question_ids=created_question_ids,
                )
            raise
        except Exception as e:
            logger.error(f"Error processing questionnaire: {e}", exc_info=True)
            # Only clean up if extraction not complete
            if not extraction_complete:
                await self._cleanup_partial_questionnaire_upload(
                    s3_keys=created_s3_keys,
                    questionnaire_id=created_questionnaire_id,
                    question_ids=created_question_ids,
                )
            self.async_tasks_service.update_task(
                task_id, status=TaskStatus.FAILED, error=str(e)
            )
            raise HTTPException(status_code=500, detail=str(e))

    def list_questionnaires_for_product(
        self, product_id: str
    ) -> list[models.QuestionnaireSummaryData]:
        organization_id = get_organization_id()
        return self.repository.list_questionnaires_for_product(
            product_id, organization_id
        )

    async def delete_questionnaire(self, questionnaire_id: str) -> str:
        db_questionnaire = self.repository.get_questionnaire_by_id(questionnaire_id)
        if not db_questionnaire:
            raise HTTPException(
                status_code=404,
                detail=f"Questionnaire with ID {questionnaire_id} not found.",
            )

        # Load all questions from the questionnaire
        questions = self.repository.get_questions_by_questionnaire_id(questionnaire_id)

        for question in questions:
            links = self.link_repository.get_links_for_question(question.id)
            for link in links:
                self.link_repository.delete_link(link.requirement_id, link.question_id)

        bucket_name = self.s3_service.UPLOAD_DOCUMENTS_BUCKET
        if await self.s3_service.file_exists(
            bucket_name, db_questionnaire.s3_object_key
        ):
            await self.s3_service.delete_file(
                bucket_name, db_questionnaire.s3_object_key
            )

        self.repository.delete_questionnaire(questionnaire_id)
        return questionnaire_id

    def get_questionnaire_summary(
        self, questionnaire_id: str
    ) -> Optional[models.QuestionnaireSummaryData]:
        summary = self.repository.get_questionnaire_summary(questionnaire_id)
        if not summary:
            raise HTTPException(
                status_code=404,
                detail=f"Questionnaire with ID {questionnaire_id} not found.",
            )
        return summary

    def get_questionnaire_details(
        self, questionnaire_id: str
    ) -> Optional[models.QuestionnaireDetails]:
        """Get questionnaire details including product_id."""
        details = self.repository.get_questionnaire_details(questionnaire_id)
        if not details:
            raise HTTPException(
                status_code=404,
                detail=f"Questionnaire with ID {questionnaire_id} not found.",
            )
        return details

    def get_questionnaire_details_by_key(
        self, questionnaire_key: str
    ) -> Optional[models.QuestionnaireDetails]:
        """Get questionnaire details by key."""
        organization_id = get_organization_id()
        db_questionnaire = self.repository.get_questionnaire_by_key_or_raise(
            questionnaire_key, organization_id
        )
        return self.repository.get_questionnaire_details(db_questionnaire.id)

    def get_questionnaire_preview(self, questionnaire_id: str) -> str:
        db_questionnaire = self.repository.get_questionnaire_by_id(questionnaire_id)
        if not db_questionnaire:
            raise HTTPException(
                status_code=404,
                detail=f"Questionnaire with ID {questionnaire_id} not found.",
            )

        # Get client name from questionnaire details
        details = self.repository.get_questionnaire_details(questionnaire_id)
        client_name = details.client_name if details else "Unknown Client"

        questions = self.repository.get_questions_by_questionnaire_id(questionnaire_id)
        if not questions:
            return f"# Questionnaire Preview\n\n**Client:** {client_name}\n\nNo questions found."

        markdown_content = f"# Questionnaire Preview\n\n**Client:** {client_name}\n\n"
        for i, q in enumerate(questions, 1):
            markdown_content += f"## Question {i}\n\n**Q:** {q.question_text}\n\n"
            if q.generated_answer:
                markdown_content += f"**A:** {q.generated_answer}\n\n"
            else:
                markdown_content += "**A:** *No answer yet.*\n\n"
        return markdown_content

    async def download_questionnaire(self, questionnaire_id: str) -> StreamingResponse:
        """
        Download a questionnaire file from S3.

        Args:
            questionnaire_id: The ID of the questionnaire to download

        Returns:
            StreamingResponse containing the file content for download

        Raises:
            HTTPException: If questionnaire not found or download fails
        """
        # Load the questionnaire from the database
        questionnaire = self.repository.get_questionnaire_by_id(questionnaire_id)
        if not questionnaire:
            raise HTTPException(
                status_code=404,
                detail=f"Questionnaire with ID {questionnaire_id} not found.",
            )

        # Download the file from S3
        file_content = await self.s3_service.download_file(
            S3Service.UPLOAD_DOCUMENTS_BUCKET, questionnaire.s3_object_key
        )

        # Create a streaming response for download
        file_stream = BytesIO(file_content)

        return StreamingResponse(
            content=iter(lambda: file_stream.read(8192), b""),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={questionnaire.file_name}"
            },
        )

    async def _generate_answers_for_questions(
        self,
        extracted_questions_data: list,
        product_id: str,
        task_id: str,
        organization_id: str,
    ) -> list:
        """Generate answers for all questions in parallel and return questions with data."""
        self.async_tasks_service.update_task(
            task_id, progress=0.7, message="Generating answers for questions"
        )

        async def generate_answer_for_question(q_data: dict) -> dict:
            """Generate answer for a single question."""
            question_text = q_data.get("question", "Missing question text")
            order = q_data.get("order")
            generated_answer = None
            answer_type = None
            source_requirement_keys: list[str] = []

            answer_response = await self.rag_service.answer_question_with_rag(
                question_text=question_text,
                product_id=product_id,
                organization_id=organization_id,
            )
            if answer_response.context_sufficient:
                generated_answer = answer_response.answer
                answer_type = answer_response.answer_type
            source_requirement_keys = answer_response.source_requirement_keys

            return {
                "question_text": question_text,
                "generated_answer": generated_answer,
                "answer_type": answer_type,
                "source_requirement_keys": source_requirement_keys,
                "order": order,
            }

        # Generate answers for all questions in parallel
        questions_with_data = await asyncio.gather(
            *[
                generate_answer_for_question(q_data)
                for q_data in extracted_questions_data
            ]
        )

        return list(questions_with_data)

    def _save_questions_to_database(
        self,
        questions_with_data: list,
        db_questionnaire,
    ) -> tuple[int, list[str]]:
        """Save all questions to database and return the count and IDs of saved questions."""
        saved_questions_count = 0
        saved_question_ids: list[str] = []
        for question_data in questions_with_data:
            question_to_create = models.QuestionnaireQuestionCreate(
                questionnaire_id=db_questionnaire.id,
                question_text=question_data["question_text"],
                answer=question_data["generated_answer"],
                answer_type=question_data.get("answer_type"),
                order=question_data["order"],
            )
            db_question = self.repository.create_question(question_to_create)
            saved_question_ids.append(str(db_question.id))

            # Create requirement-question links if source requirements were referenced
            source_keys = question_data.get("source_requirement_keys", [])
            if source_keys:
                requirement_ids = self.repository.get_requirement_ids_by_keys(
                    source_keys
                )
                if requirement_ids:
                    self.link_repository.create_links_for_question(
                        db_question.id, requirement_ids
                    )

            saved_questions_count += 1

        return saved_questions_count, saved_question_ids
