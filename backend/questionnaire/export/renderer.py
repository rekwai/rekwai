import datetime
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from fastapi import HTTPException

try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    from weasyprint import HTML
except Exception as e:  # pragma: no cover - optional dependency handling
    Environment = None  # type: ignore
    FileSystemLoader = None  # type: ignore
    select_autoescape = None  # type: ignore
    HTML = None  # type: ignore
    _IMPORT_ERROR = e
else:
    _IMPORT_ERROR = None


@dataclass
class LinkedRequirement:
    key: Optional[str]
    description: Optional[str]


@dataclass
class QAItem:
    index: int
    question: str
    answer: Optional[str]
    linked_requirements: Optional[List[LinkedRequirement]] = None


@dataclass
class QuestionnairePdfData:
    id: str
    client_name: str
    file_name: str
    uploaded_at: datetime.datetime
    total_questions: int
    answered_questions: int
    product_name: Optional[str]
    qa: List[QAItem]
    include_linked_requirements: bool = False


def _get_templates_dir() -> Path:
    return Path(__file__).parent / "templates"


def render_questionnaire_pdf(data: QuestionnairePdfData) -> bytes:
    """Render the questionnaire as PDF and return PDF bytes.

    Raises HTTPException 500 if dependencies are missing or rendering fails.
    """
    if Environment is None or HTML is None:
        # Give a helpful error if WeasyPrint/Jinja2 are not installed
        raise HTTPException(
            status_code=500,
            detail=f"PDF export dependencies are missing: {_IMPORT_ERROR}",
        )

    try:
        env = Environment(
            loader=FileSystemLoader(str(_get_templates_dir())),
            autoescape=select_autoescape(["html", "xml"]),
        )
        template = env.get_template("questionnaire_pdf.html")

        html_str = template.render(data=data)
        pdf_bytes = HTML(
            string=html_str, base_url=str(_get_templates_dir())
        ).write_pdf()
        return pdf_bytes
    except Exception as e:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {e}")
