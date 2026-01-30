"""Repository for client database operations."""

from typing import Optional, List

from sqlalchemy.orm import Session

from . import tables, models


class ClientRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_client(self, client_id: str) -> Optional[tables.ClientDB]:
        """Get a client by ID."""
        return (
            self.db.query(tables.ClientDB)
            .filter(tables.ClientDB.id == client_id)
            .first()
        )

    def get_client_by_name(
        self, organization_id: str, client_name: str
    ) -> Optional[tables.ClientDB]:
        """Get a client by name within an organization."""
        return (
            self.db.query(tables.ClientDB)
            .filter(
                tables.ClientDB.organization_id == organization_id,
                tables.ClientDB.name == client_name,
            )
            .first()
        )

    def get_clients(self, organization_id: str) -> List[tables.ClientDB]:
        """Get all clients for an organization."""
        return (
            self.db.query(tables.ClientDB)
            .filter(tables.ClientDB.organization_id == organization_id)
            .all()
        )

    def create_client(
        self, client: models.ClientCreate, organization_id: str, key: str
    ) -> tables.ClientDB:
        """Create a new client."""
        db_client = tables.ClientDB(
            name=client.name,
            organization_id=organization_id,
            key=key,
        )
        self.db.add(db_client)
        self.db.commit()
        self.db.refresh(db_client)
        return db_client
