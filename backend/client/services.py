"""Client services for business logic."""

import logging
from typing import List, Optional

from fastapi import HTTPException
from pydantic import BaseModel
from auth.org_context import get_organization_id
from ai_framework.agent import create_agent
from . import models
from .repository import ClientRepository
from .tables import ClientDB

logger = logging.getLogger(__name__)


class ClientService:
    def __init__(self, repository: ClientRepository):
        self.repository = repository

    def _convert_to_pydantic(self, db_client: ClientDB) -> models.Client:
        """
        Converts a SQLAlchemy ClientDB object to a Pydantic Client model.
        """
        return models.Client(
            id=str(db_client.id),
            name=db_client.name,
            organization_id=str(db_client.organization_id),
            key=db_client.key,
            creation_date=db_client.creation_date,
        )

    async def _generate_key_from_name(self, name: str, organization_id: str) -> str:
        """
        Generate a client key using LLM based on the client name.
        Returns a string between 3 and 6 uppercase characters.
        """
        # Get all existing client keys in the organization
        existing_clients = self.repository.get_clients(organization_id)
        existing_keys = [client.key for client in existing_clients]
        existing_keys_str = ", ".join(existing_keys) if existing_keys else "None"

        # Construct the prompt for the LLM
        prompt = f"""You are a product manager and you are task to generate a client key from a client name.
Given a client name, generate a String between 3 and 6 characters, all upper case and only letters to describe the client to the best of your abilities.
This key needs to be unique in the organization. Existing client keys in the organization: {existing_keys_str}.

Examples:
Client name: Axon -> Client key: AXON
Client name: Google Inc -> Client key: GOOGLE
Client name: Amazone -> Client key: AMAZ
Client name: The Toronto-Dominion Bank -> Client key: TDB
Client name: Goldman Sachs Group, Inc. -> Client key: GOLDSA"""

        # Schema for LLM response
        class ClientKeySchema(BaseModel):
            client_key: str

        # Call LLM to generate the key
        try:
            agent = create_agent(
                "fast", system_prompt=prompt, output_type=ClientKeySchema
            )
            result = await agent.run(name)
            client_key = result.output.client_key.upper()
        except Exception as e:
            logger.error(f"Failed to generate client key via agent: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate client key")

        # Validate the key format (3-6 uppercase letters)
        if (
            not client_key
            or not (3 <= len(client_key) <= 6)
            or not client_key.isalpha()
        ):
            logger.error(f"LLM generated invalid key: {client_key}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate valid client key. LLM produced invalid key: {client_key}",
            )

        return client_key

    async def create_client(self, client_data: models.ClientCreate) -> models.Client:
        """
        Creates a new client.
        Automatically generates the key using LLM based on the client name.
        """
        logger.info(f"Creating client with name: {client_data.name}")
        organization_id = get_organization_id()

        # Check if client with same name already exists
        existing_client = self.repository.get_client_by_name(
            organization_id, client_data.name
        )
        if existing_client:
            raise HTTPException(
                status_code=400,
                detail="Client with this name already exists in this organization.",
            )

        key = await self._generate_key_from_name(client_data.name, organization_id)
        db_client = self.repository.create_client(client_data, organization_id, key)
        logger.info(f"Successfully created client ID: {db_client.id} with key: {key}")
        return self._convert_to_pydantic(db_client)

    def get_client(self, client_id: str) -> Optional[models.Client]:
        """
        Retrieves a single client by its ID.
        """
        db_client = self.repository.get_client(client_id)
        if db_client is None:
            return None
        return self._convert_to_pydantic(db_client)

    def get_clients(self) -> List[models.Client]:
        """
        Retrieves all clients for the current organization.
        """
        organization_id = get_organization_id()
        db_clients = self.repository.get_clients(organization_id)
        return [self._convert_to_pydantic(db_client) for db_client in db_clients]
