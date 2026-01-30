"""
Module for extracting text content from various document types and converting it to Markdown.

Utilizes the docling-serve API service for conversion of supported formats (PDF, DOCX, XLSX)
and handles plain text and Markdown files directly.
"""

from io import BytesIO
from pathlib import Path
import logging
import httpx
import os
import mimetypes

logger = logging.getLogger(__name__)

# Docling API service configuration
DOCLING_HOST = os.getenv("DOCLING_HOST", "localhost")
DOCLING_PORT = os.getenv("DOCLING_PORT", "5001")
DOCLING_API_URL = f"http://{DOCLING_HOST}:{DOCLING_PORT}"


async def extract_text_from_file(file_content: bytes, file_name: str) -> str:
    """
    Extracts text content from file content and returns it as Markdown.

    For .txt and .md files, decodes the content directly.
    For other supported types, uses the docling-serve API to extract Markdown.

    Args:
        file_content: The file content as bytes.
        file_name: The name of the file (used for extension detection and API calls).

    Returns:
        The extracted text content as a string (raw text for .txt/.md, Markdown for others).

    Raises:
        ValueError: If file_content is empty or file_name is invalid.
        IOError: If the content cannot be decoded (for .txt/.md).
        Exception: If text extraction fails for any other reason (e.g., API error).
    """
    if not file_content:
        logger.error("File content is empty")
        raise ValueError("File content cannot be empty")

    if not file_name:
        logger.error("File name is empty")
        raise ValueError("File name cannot be empty")

    file_extension = Path(file_name).suffix.lower()
    logger.info(f"Starting text extraction for '{file_name}' (type: {file_extension})")

    if file_extension in [".txt", ".md"]:
        return _extract_plain_text(file_content, file_name)
    else:
        return await _extract_via_docling(file_content, file_name)


def _extract_plain_text(file_content: bytes, file_name: str) -> str:
    """Extract content from plain text or markdown files."""
    logger.info(f"Reading '{file_name}' directly as plain text/Markdown...")
    try:
        content = file_content.decode("utf-8")
        logger.info(f"Successfully decoded '{file_name}'. Length: {len(content)}")
        return content
    except UnicodeDecodeError as decode_error:
        logger.error(f"Error decoding file {file_name}: {decode_error}", exc_info=True)
        raise IOError(f"Failed to decode file {file_name}") from decode_error


async def _extract_via_docling(file_content: bytes, file_name: str) -> str:
    """Extract markdown content via the docling-serve API."""
    logger.info(
        f"Processing '{file_name}' with docling-serve API for Markdown extraction..."
    )

    mime_type, _ = mimetypes.guess_type(file_name)
    if not mime_type:
        mime_type = "application/octet-stream"
    logger.debug(f"Detected MIME type: {mime_type}")

    parameters = {
        "from_formats": [
            "docx",
            "pptx",
            "html",
            "image",
            "pdf",
            "asciidoc",
            "md",
            "xlsx",
        ],
        "to_formats": ["md"],
        "image_export_mode": "placeholder",
        "do_ocr": True,
        "force_ocr": False,
        "ocr_engine": "easyocr",
        "ocr_lang": ["en"],
        "pdf_backend": "dlparse_v2",
        "table_mode": "fast",
        "abort_on_error": True,
        "return_as_file": False,
    }
    logger.debug(f"API parameters: {parameters}")

    file_stream = BytesIO(file_content)
    files = {"files": (file_name, file_stream, mime_type)}

    logger.debug(f"Making request to docling-serve API for '{file_name}'...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{DOCLING_API_URL}/v1/convert/file",
                files=files,
                data=parameters,
                timeout=60.0,
            )
        response.raise_for_status()
    except httpx.HTTPStatusError as http_error:
        logger.error(
            f"API returned error status for '{file_name}': {http_error.response.status_code}",
            exc_info=True,
        )
        raise Exception(f"Docling API request failed for {file_name}") from http_error
    except httpx.RequestError as api_error:
        logger.error(
            f"API request failed for '{file_name}': {api_error}",
            exc_info=True,
        )
        raise Exception(f"Docling API request failed for {file_name}") from api_error

    response_json = response.json()

    try:
        extracted_markdown = response_json["document"]["md_content"]
    except (KeyError, TypeError) as e:
        logger.error(f"Invalid response structure from API: {response_json}")
        raise Exception(
            f"Invalid response structure from docling API for {file_name}"
        ) from e

    if not extracted_markdown:
        logger.error("Empty markdown content in API response")
        raise Exception(f"No markdown content in API response for {file_name}")

    logger.info(
        f"Successfully extracted Markdown from '{file_name}'. Length: {len(extracted_markdown)}"
    )

    return extracted_markdown
