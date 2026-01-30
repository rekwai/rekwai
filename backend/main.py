"""Main FastAPI application for the Rekwai backend API."""

import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import text

load_dotenv()

log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, log_level, logging.INFO))
logging.info(f"Logging level set to {log_level}")

# Suppress verbose logs from third-party libraries only if not in debug mode
if log_level != "DEBUG":
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("google_genai.models").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

# Configure Logfire for Pydantic AI observability (optional)
# Set ENABLE_LOGFIRE=true in environment to enable
if os.getenv("ENABLE_LOGFIRE", "false").lower() == "true":
    try:
        import logfire

        logfire.configure(service_name="rekwai-backend")
        logfire.instrument_pydantic_ai()
        logfire.instrument_httpx(capture_all=True)
        logger.info("Logfire configured and instrumentation enabled")
    except Exception as e:
        logger.error(f"Failed to configure Logfire: {e}")
        raise RuntimeError(
            "Logfire configuration failed. Ensure you are authenticated with 'logfire auth'."
        ) from e
else:
    logger.info("Logfire is disabled. Set ENABLE_LOGFIRE=true to enable observability.")

PROJECT_ROOT = Path(__file__).resolve().parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
    logger.info(f"Added project root to sys.path: {PROJECT_ROOT}")

try:
    from requirements import router as requirements
    from questionnaire import router as questionnaires
    from product import router as products
    from client import router as clients
    from async_tasks import router as async_tasks
    import mcp_setup
    from auth.middleware import JWTOrgIdMiddleware
    from database import get_db
except ImportError as e:
    logger.error(f"Failed to import routers: {e}", exc_info=True)
    raise RuntimeError("Could not load API routers.") from e

try:
    from organization.tables import OrganizationDB  # noqa: F401

    logger.info("Successfully imported organization models")
except ImportError as e:
    logger.error(f"Failed to import organization models: {e}", exc_info=True)
    raise RuntimeError("Could not load organization models.") from e

app = FastAPI(
    title="Rekwai Backend API",
    description="API for managing requirements and questionnaires.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Add Private Network Access support at the application level
@app.middleware("http")
async def add_cors_private_network_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


app.add_middleware(JWTOrgIdMiddleware)

app.include_router(requirements.router)
app.include_router(questionnaires.router)
app.include_router(products.router)
app.include_router(clients.router)
app.include_router(async_tasks.router)

mcp_setup.setup_mcp(app)

logger.info("Registered Routes:")
for route in app.routes:
    if isinstance(route, APIRoute):
        logger.info(f"Path: {route.path}, Name: {route.name}, Methods: {route.methods}")


@app.get("/")
async def read_root():
    """Root endpoint providing basic API information."""
    return {"message": "Welcome to the Rekwai Backend API"}


@app.get("/health")
async def health_check(db: Session = Depends(get_db), response: Response = None):
    """Health check endpoint with database connectivity verification."""
    health_status = {"status": "ok", "database": "ok"}

    try:
        # Test database connectivity with a simple query
        db.execute(text("SELECT 1")).fetchone()
        logger.info("Database connectivity check passed")
    except Exception as e:
        logger.error(f"Database connectivity check failed: {e}")
        health_status["status"] = "degraded"
        health_status["database"] = "error"
        health_status["database_error"] = str(e)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return health_status


logger.info("FastAPI application configured and routers included.")
