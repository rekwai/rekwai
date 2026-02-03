from fastapi import Depends
from sqlalchemy.orm import Session

from database import get_db, engine
from client.repository import ClientRepository
from client.services import ClientService
from product.repository import ProductRepository
from product.services import ProductService
from questionnaire.repository import QuestionnaireRepository
from questionnaire.services import QuestionnaireService
from questionnaire.questions import QuestionService
from questionnaire.extraction.extract_questions import QuestionExtractor
from questionnaire.rag.answer_questions import RagQuestionAnsweringService
from requirements.crud.services import RequirementService
from requirements.crud.repository import RequirementRepository
from requirements.crud.comparison import RequirementComparisonService
from requirements.document.extraction.extraction import RequirementExtractionService
from ai.external_ai import ExternalAIService
from s3_service import S3Service
from async_tasks.services import AsyncTasksService
from requirements.document.repository import RequirementDocumentRepository
from requirements.document.services import RequirementDocumentService
from requirements.question_link.repository import RequirementQuestionLinkRepository
from requirements.extraction_link.repository import RequirementExtractionLinkRepository


def get_s3_service() -> S3Service:
    return S3Service()


def get_external_ai_service() -> ExternalAIService:
    return ExternalAIService()


def get_product_repository(db: Session = Depends(get_db)) -> ProductRepository:
    return ProductRepository(db)


def get_product_service(
    repository: ProductRepository = Depends(get_product_repository),
) -> ProductService:
    return ProductService(repository)


def get_client_repository(db: Session = Depends(get_db)) -> ClientRepository:
    return ClientRepository(db)


def get_client_service(
    repository: ClientRepository = Depends(get_client_repository),
) -> ClientService:
    return ClientService(repository)


def get_questionnaire_repository(
    db: Session = Depends(get_db),
) -> QuestionnaireRepository:
    return QuestionnaireRepository(db)


def get_question_extractor(
    s3_service: S3Service = Depends(get_s3_service),
) -> QuestionExtractor:
    return QuestionExtractor(s3_service)


def get_rag_question_answering_service() -> RagQuestionAnsweringService:
    return RagQuestionAnsweringService(
        db_engine=engine,
    )


def get_requirement_repository(db: Session = Depends(get_db)) -> RequirementRepository:
    return RequirementRepository(db)


def get_requirement_document_repository(
    db: Session = Depends(get_db),
) -> RequirementDocumentRepository:
    return RequirementDocumentRepository(db)


def get_requirement_question_link_repository(
    db: Session = Depends(get_db),
) -> RequirementQuestionLinkRepository:
    return RequirementQuestionLinkRepository(db)


def get_requirement_extraction_link_repository(
    db: Session = Depends(get_db),
) -> RequirementExtractionLinkRepository:
    return RequirementExtractionLinkRepository(db)


def get_requirement_document_service(
    repository: RequirementDocumentRepository = Depends(
        get_requirement_document_repository
    ),
    requirement_repository: RequirementRepository = Depends(get_requirement_repository),
    extraction_link_repository: RequirementExtractionLinkRepository = Depends(
        get_requirement_extraction_link_repository
    ),
    s3_service: S3Service = Depends(get_s3_service),
) -> RequirementDocumentService:
    return RequirementDocumentService(
        repository,
        requirement_repository,
        extraction_link_repository,
        s3_service,
    )


def get_requirement_comparison_service(
    external_ai_service: ExternalAIService = Depends(get_external_ai_service),
    requirement_repository: RequirementRepository = Depends(get_requirement_repository),
) -> RequirementComparisonService:
    return RequirementComparisonService(external_ai_service, requirement_repository)


def get_question_service(
    repository: QuestionnaireRepository = Depends(get_questionnaire_repository),
    link_repository: RequirementQuestionLinkRepository = Depends(
        get_requirement_question_link_repository
    ),
    comparison_service: RequirementComparisonService = Depends(
        get_requirement_comparison_service
    ),
) -> QuestionService:
    return QuestionService(
        repository,
        link_repository,
        comparison_service,
    )


# Global instance for AsyncTasksService
_async_tasks_instance = None


def get_async_tasks_service() -> AsyncTasksService:
    """Dependency to get the AsyncTasksService instance."""
    global _async_tasks_instance
    if _async_tasks_instance is None:
        _async_tasks_instance = AsyncTasksService()
    return _async_tasks_instance


def get_questionnaire_service(
    repository: QuestionnaireRepository = Depends(get_questionnaire_repository),
    question_extractor: QuestionExtractor = Depends(get_question_extractor),
    s3_service: S3Service = Depends(get_s3_service),
    async_tasks_service: AsyncTasksService = Depends(get_async_tasks_service),
    rag_service: RagQuestionAnsweringService = Depends(
        get_rag_question_answering_service
    ),
    link_repository: RequirementQuestionLinkRepository = Depends(
        get_requirement_question_link_repository
    ),
    client_service: ClientService = Depends(get_client_service),
    product_service: ProductService = Depends(get_product_service),
) -> QuestionnaireService:
    return QuestionnaireService(
        repository=repository,
        question_extractor=question_extractor,
        s3_service=s3_service,
        async_tasks_service=async_tasks_service,
        rag_service=rag_service,
        link_repository=link_repository,
        client_service=client_service,
        product_service=product_service,
    )


def get_requirement_extraction_service(
    s3_service: S3Service = Depends(get_s3_service),
    async_tasks_service: AsyncTasksService = Depends(get_async_tasks_service),
) -> RequirementExtractionService:
    return RequirementExtractionService(s3_service, async_tasks_service)


def get_requirement_service(
    repository: RequirementRepository = Depends(get_requirement_repository),
    rag_service: RagQuestionAnsweringService = Depends(
        get_rag_question_answering_service
    ),
    comparison_service: RequirementComparisonService = Depends(
        get_requirement_comparison_service
    ),
    extraction_service: RequirementExtractionService = Depends(
        get_requirement_extraction_service
    ),
    external_ai_service: ExternalAIService = Depends(get_external_ai_service),
    s3_service: S3Service = Depends(get_s3_service),
    requirement_document_service: RequirementDocumentService = Depends(
        get_requirement_document_service
    ),
    extraction_link_repository: RequirementExtractionLinkRepository = Depends(
        get_requirement_extraction_link_repository
    ),
    async_tasks_service: AsyncTasksService = Depends(get_async_tasks_service),
) -> RequirementService:
    return RequirementService(
        repository=repository,
        rag_service=rag_service,
        comparison_service=comparison_service,
        extraction_service=extraction_service,
        external_ai_service=external_ai_service,
        s3_service=s3_service,
        requirement_document_service=requirement_document_service,
        extraction_link_repository=extraction_link_repository,
        async_tasks_service=async_tasks_service,
    )
