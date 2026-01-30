"""
API endpoints for managing clients.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status

from dependencies import get_client_service
from client.models import Client, ClientCreate
from client.services import ClientService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/client",
    tags=["client"],
)


@router.post(
    "/",
    response_model=Client,
    status_code=status.HTTP_201_CREATED,
)
async def create_client_endpoint(
    client: ClientCreate, service: ClientService = Depends(get_client_service)
):
    """
    Creates a new client.
    The client key is automatically generated using LLM based on the client name.
    """
    logger.info(f"Received request to create client: {client.name}")
    return await service.create_client(client)


@router.get("/", response_model=list[Client], operation_id="list_clients")
def list_clients(service: ClientService = Depends(get_client_service)):
    """
    Retrieves all clients for the current organization.
    """
    logger.info("Received request to read all clients")
    return service.get_clients()


@router.get(
    "/{client_id}",
    response_model=Client,
)
def read_client(client_id: str, service: ClientService = Depends(get_client_service)):
    """
    Retrieves a single client by its ID.
    """
    logger.info(f"Received request to read client ID: {client_id}")
    db_client = service.get_client(client_id)
    if db_client is None:
        logger.warning(f"Client with ID {client_id} not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with ID {client_id} not found",
        )
    logger.info(f"Returning client ID: {client_id}")
    return db_client
