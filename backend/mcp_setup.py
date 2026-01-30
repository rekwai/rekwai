"""MCP server configuration."""

import logging
from fastapi import FastAPI
from fastapi_mcp import FastApiMCP

logger = logging.getLogger(__name__)


def setup_mcp(app: FastAPI) -> FastApiMCP:
    """Set up the MCP server for the FastAPI application."""
    logger.info("Setting up MCP server")

    mcp_server = FastApiMCP(
        fastapi=app,
        name="Rekwai MCP API",
        description="MCP API for Rekwai",
        include_operations=[
            "list_products",
            "list_requirements",
            "answer_requirements_question",
        ],
    )

    mcp_server.mount_http(mount_path="/mcp")
    logger.info("MCP server set up successfully")
    return mcp_server
