"""Tool factories for source document operations in question answering workflow.

This module provides tool factory functions that create Pydantic AI tools
for retrieving source documents linked to requirements.
"""

import os
import re
from typing import Awaitable, Callable, List
from pydantic_ai import RunContext

from ai_framework.workflow.question.answering.answering_deps import AnsweringDeps
from ai_framework.workflow.question.answering.models import SourceDocumentInfo
from ai_framework.workflow.question.answering.requirement_tools import (
    create_repository_services,
)
from requirements.crud.tables import ExtractedRequirementDB, RequirementDB
from requirements.document.tables import RequirementDocumentDB
from requirements.extraction_link.tables import RequirementExtractionLinkDB
from s3_service import S3Service


def create_get_source_documents_tool() -> Callable[
    [RunContext[AnsweringDeps], str], Awaitable[List[SourceDocumentInfo]]
]:
    """
    Create a tool for getting source documents linked to a requirement.

    This tool allows the agent to retrieve the list of source documents that are
    linked to a specific requirement through extracted requirements. It traces the
    relationship chain: requirement → extracted_requirement → document.

    Returns:
        An async tool function that can be registered with an agent.
    """

    async def get_source_documents(
        ctx: RunContext[AnsweringDeps],
        requirement_key: str,
    ) -> List[SourceDocumentInfo]:
        """
        Get source documents linked to a requirement.

        This tool retrieves the list of source documents that contain extracted
        requirements linked to the specified requirement. It returns only user-facing
        metadata (document_key and filename), deliberately excluding internal
        identifiers like s3_object_key.

        The relationship chain traced is:
        requirement (by key) → requirement_link_extraction → extracted_requirement → document

        Args:
            ctx: The run context containing AnsweringDeps
            requirement_key: The requirement identifier (e.g., "REQ-AUTH-001")

        Returns:
            List of SourceDocumentInfo objects with document_key and filename.
            Returns empty list if requirement doesn't exist or has no linked documents.
        """
        ctx.deps.total_tool_call_count += 1

        deps = ctx.deps

        # Create session and services with proper lifecycle management
        with create_repository_services(deps) as (
            session,
            requirement_repo,
            _,
        ):
            # Step 1: Get the requirement by key to find its ID
            req_dto = requirement_repo.get_by_key(
                requirement_key=requirement_key,
                organization_id=deps.organization_id,
            )

            if req_dto is None:
                # Requirement doesn't exist
                return []

            # Step 2: Query for source documents via the relationship chain
            # Join: requirement → requirement_link_extraction → extracted_requirement → requirement_document
            results = (
                session.query(
                    RequirementDocumentDB.document_key,
                    RequirementDocumentDB.original_filename,
                )
                .join(
                    ExtractedRequirementDB,
                    ExtractedRequirementDB.document_id == RequirementDocumentDB.id,
                )
                .join(
                    RequirementExtractionLinkDB,
                    RequirementExtractionLinkDB.extracted_requirement_id
                    == ExtractedRequirementDB.id,
                )
                .join(
                    RequirementDB,
                    RequirementDB.id == RequirementExtractionLinkDB.requirement_id,
                )
                .filter(RequirementDB.id == req_dto.id)
                .distinct()  # Avoid duplicates if multiple extracted reqs from same doc
                .all()
            )

            # Step 3: Transform to SourceDocumentInfo objects
            return [
                SourceDocumentInfo(
                    document_key=doc_key,
                    filename=filename,
                )
                for doc_key, filename in results
            ]

    return get_source_documents


def create_search_source_document_tool() -> Callable[
    [RunContext[AnsweringDeps], str, str], Awaitable[List[str]]
]:
    """
    Create a tool for searching within a source document by document_key.

    This tool allows the agent to search for text patterns within a specific source
    document. It accepts the user-facing document_key, resolves it to the internal
    s3_object_key, and performs a regex search on the document content.

    Returns:
        An async tool function that can be registered with an agent.
    """

    async def search_source_document(
        ctx: RunContext[AnsweringDeps],
        document_key: str,
        pattern: str,
    ) -> List[str]:
        """
        Search within a source document using a regex pattern.

        This tool searches for text patterns within a specific source document.
        The agent provides the user-facing document_key (e.g., "DOC-SEC-001"),
        and the tool internally resolves it to the S3 object key to fetch and
        search the document content.

        Args:
            ctx: The run context containing AnsweringDeps
            document_key: The user-facing document identifier (e.g., "DOC-SEC-001")
            pattern: The regex pattern to search for in the document

        Returns:
            List of lines from the document that match the pattern.
            Returns empty list if document doesn't exist or pattern doesn't match.

        Raises:
            ValueError: If regex pattern is invalid
        """
        ctx.deps.source_doc_search_count += 1
        ctx.deps.total_tool_call_count += 1

        deps = ctx.deps

        # Step 1: Query database to resolve document_key to s3_object_key
        with create_repository_services(deps) as (
            session,
            _,
            _,
        ):
            # Query for the document by document_key and organization_id
            doc_result = (
                session.query(RequirementDocumentDB.s3_object_key)
                .filter(
                    RequirementDocumentDB.document_key == document_key,
                    RequirementDocumentDB.organization_id == deps.organization_id,
                )
                .first()
            )

            if doc_result is None:
                # Document doesn't exist - return empty list
                return []

            s3_object_key = doc_result[0]

        # Step 2: Derive the extracted markdown S3 key from original
        # Original files are stored as: {org_id}/requirement_documents/{uuid}.pdf
        # Extracted markdown is stored as: {org_id}/requirement_documents/{uuid}_extracted.md
        base_key = os.path.splitext(s3_object_key)[0]  # Remove extension
        markdown_s3_key = f"{base_key}_extracted.md"

        # Step 3: Download the extracted markdown from S3
        try:
            file_bytes = await deps.s3_service.download_file(
                bucket_name=S3Service.UPLOAD_DOCUMENTS_BUCKET,
                object_key=markdown_s3_key,
            )
        except Exception as e:
            error_msg = f"Failed to download extracted content for document '{document_key}' from S3: {e}"
            raise ValueError(error_msg) from e

        # Step 4: Decode to string (extracted markdown is always UTF-8)
        content = file_bytes.decode("utf-8")

        # Step 5: Compile regex pattern
        try:
            regex = re.compile(pattern)
        except re.error as e:
            return [
                f"ERROR: Invalid regex pattern '{pattern}': {str(e)}. "
                f"Tip: If using case-insensitive flag (?i), place it only at the START of the pattern, "
                f"e.g., '(?i)word1|word2|word3' NOT '(?i)word1|(?i)word2|(?i)word3'."
            ]

        # Step 6: Search for matching lines
        return [line for line in content.splitlines() if regex.search(line)]

    return search_source_document
