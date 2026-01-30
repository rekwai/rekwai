"""Router for managing requirements, including main and document sub-routers."""

from fastapi import APIRouter

from .crud import router as requirements_crud
from .document import router as requirements_document
from .question_link import router as question_link
from .extraction_link import router as extraction_link

router = APIRouter(
    prefix="/requirements",
    tags=["requirements"],
)

router.include_router(requirements_document.router)
router.include_router(requirements_crud.router)
router.include_router(question_link.router)
router.include_router(extraction_link.router)
