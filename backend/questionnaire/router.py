"""API endpoints for managing questionnaires."""

from typing import List
from uuid import UUID
from io import BytesIO

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    Depends,
    BackgroundTasks,
    status,
    Query,
)
from fastapi.responses import PlainTextResponse, StreamingResponse

from dependencies import (
    get_questionnaire_service,
    get_question_service,
    get_async_tasks_service,
)
from questionnaire.models import (
    QuestionnaireQuestion,
    QuestionReviewInput,
    QuestionnaireSummaryData,
    QuestionnaireDetails,
    SaveAnswerRequest,
    QuestionGeneratedRequirement,
)
from requirements.crud.models import SimilarRequirementWithLLM
from async_tasks.models import TaskCreateResponse
from async_tasks.services import AsyncTasksService, TaskType
from questionnaire.services import (
    QuestionnaireService,
)
from questionnaire.questions import (
    QuestionService,
)

router = APIRouter(
    prefix="/questionnaires",
    tags=["questionnaires"],
)


@router.post(
    "/upload-async",
    response_model=TaskCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_questionnaire_document_async(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    client_id: str = Form(...),
    product_id: str = Form(...),
    async_tasks_service: AsyncTasksService = Depends(get_async_tasks_service),
    service: QuestionnaireService = Depends(get_questionnaire_service),
):
    """Upload and process questionnaire document asynchronously, extracting questions."""
    task_id = async_tasks_service.create_task(
        f"Extract questions from {file.filename}", TaskType.EXTRACT_QUESTIONS
    )
    file_content = await file.read()
    background_tasks.add_task(
        service.upload_and_process_questionnaire_async,
        file.filename,
        file_content,
        client_id,
        product_id,
        task_id,
    )

    return TaskCreateResponse(task_id=task_id)


@router.get(
    "/key/{questionnaire_key}/questions",
    response_model=List[QuestionnaireQuestion],
)
async def get_questionnaire_questions(
    questionnaire_key: str, service: QuestionService = Depends(get_question_service)
):
    """Retrieve all questions for a specific questionnaire by key."""
    return service.get_questions_by_questionnaire_key(questionnaire_key)


@router.get("/", response_model=List[QuestionnaireSummaryData])
async def list_questionnaires(
    product_id: str, service: QuestionnaireService = Depends(get_questionnaire_service)
):
    """Retrieve all questionnaires for a specific product with summary information."""
    return service.list_questionnaires_for_product(product_id)


@router.get("/key/{questionnaire_key}/details", response_model=QuestionnaireDetails)
async def get_questionnaire_details(
    questionnaire_key: str,
    service: QuestionnaireService = Depends(get_questionnaire_service),
):
    """Retrieve questionnaire details by questionnaire key."""
    return service.get_questionnaire_details_by_key(questionnaire_key)


@router.get("/{questionnaire_id}/export/pdf")
async def export_questionnaire_pdf(
    questionnaire_id: str,
    include_linked_requirements: bool = Query(False),
    service: QuestionnaireService = Depends(get_questionnaire_service),
):
    """Generate and return the questionnaire as a PDF file.

    Query params:
    - include_linked_requirements: when true, include requirements linked to each question.
    """
    pdf_bytes = service.export_questionnaire_pdf(
        questionnaire_id, include_linked_requirements=include_linked_requirements
    )
    filename = f"questionnaire_{questionnaire_id}.pdf"
    return StreamingResponse(
        content=BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


@router.post("/questions/{question_id}/review", response_model=QuestionnaireQuestion)
async def review_question_endpoint(
    question_id: UUID,
    review_input: QuestionReviewInput,
    service: QuestionService = Depends(get_question_service),
):
    """Update review status and comments for a questionnaire question."""
    return service.review_question(question_id, review_input)


@router.post(
    "/questions/{question_id}/save_answer", response_model=QuestionnaireQuestion
)
async def save_question_answer_endpoint(
    question_id: str,
    request: SaveAnswerRequest,
    service: QuestionService = Depends(get_question_service),
):
    """Save an answer to a specific questionnaire question."""
    return service.save_question_answer(
        question_id, request.answer, request.answer_type
    )


@router.delete("/{questionnaire_id}", response_model=str)
async def delete_questionnaire_endpoint(
    questionnaire_id: str,
    service: QuestionnaireService = Depends(get_questionnaire_service),
):
    """
    Deletes an entire questionnaire, including its associated questions and uploaded file.
    """
    return await service.delete_questionnaire(questionnaire_id)


@router.delete("/questions/{question_id}", response_model=QuestionnaireQuestion)
async def delete_question_endpoint(
    question_id: UUID, service: QuestionService = Depends(get_question_service)
):
    """
    Deletes a specific questionnaire question.
    """
    return service.delete_question(question_id)


@router.get("/{questionnaire_id}/preview", response_class=PlainTextResponse)
async def get_questionnaire_preview(
    questionnaire_id: str,
    service: QuestionnaireService = Depends(get_questionnaire_service),
):
    """
    Fetches the Markdown preview content for a specific questionnaire.
    """
    return service.get_questionnaire_preview(questionnaire_id)


@router.get("/{questionnaire_id}/download")
async def download_questionnaire(
    questionnaire_id: str,
    service: QuestionnaireService = Depends(get_questionnaire_service),
):
    """
    Download the original questionnaire file.

    Args:
        questionnaire_id: The ID of the questionnaire to download

    Returns:
        StreamingResponse containing the file content for download
    """
    return await service.download_questionnaire(questionnaire_id)


@router.get("/questions/{question_id}/requirement-links", response_model=List[str])
async def get_question_requirement_links(
    question_id: str, service: QuestionService = Depends(get_question_service)
):
    """Get requirement links for a specific question."""
    return service.get_requirement_links(question_id)


@router.get(
    "/questions/{question_id}/similar",
    response_model=List[SimilarRequirementWithLLM],
)
async def get_similar_requirements_for_question(
    question_id: str,
    limit: int = 3,
    filter_req: List[str] = Query(default=[]),
    service: QuestionService = Depends(get_question_service),
):
    """
    Find requirements similar to a given questionnaire question using vector search,
    then perform LLM-based comparison on the top results.

    Uses the question ID to load the question from the database.
    Optionally filters out specific requirement IDs using the 'filter_req' query parameter.
    """
    return await service.find_similar_requirements_for_question(
        question_id, limit, filter_req if filter_req else None
    )


@router.get(
    "/questions/{question_id}/generate-requirement",
    response_model=QuestionGeneratedRequirement,
)
async def generate_requirement_from_question(
    question_id: str,
    service: QuestionService = Depends(get_question_service),
):
    """
    Generate a requirement from a given questionnaire question using AI.

    Uses the question ID to load the question from the database and generate
    a requirement with all necessary fields using LLM.
    """
    return await service.generate_requirement_from_question(question_id)
