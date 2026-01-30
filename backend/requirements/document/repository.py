"""Repository for requirement document-related database operations."""

from typing import Optional, List

from sqlalchemy.orm import Session

from . import models, tables


class RequirementDocumentRepository:
    """Repository for handling requirement document-related database operations."""

    def __init__(self, db: Session):
        self.db = db

    def create(
        self, document_data: models.RequirementDocumentCreate
    ) -> models.RequirementDocument:
        """Create a new requirement document record in the database."""
        db_doc = tables.RequirementDocumentDB(**document_data.model_dump())
        self.db.add(db_doc)
        self.db.flush()
        self.db.refresh(db_doc)
        new_doc = models.RequirementDocument.model_validate(db_doc)
        self.db.commit()
        return new_doc

    def get_by_id(self, document_id: str) -> Optional[models.RequirementDocument]:
        """Get a requirement document by its id."""
        db_doc = (
            self.db.query(tables.RequirementDocumentDB)
            .filter(tables.RequirementDocumentDB.id == document_id)
            .first()
        )
        if not db_doc:
            return None
        return models.RequirementDocument.model_validate(db_doc)

    def get_by_product(
        self, product_id: str, organization_id: str
    ) -> List[models.RequirementDocument]:
        """Get all requirement documents for a specific product and organization."""
        db_docs = (
            self.db.query(tables.RequirementDocumentDB)
            .filter(
                tables.RequirementDocumentDB.product_id == product_id,
                tables.RequirementDocumentDB.organization_id == organization_id,
            )
            .order_by(tables.RequirementDocumentDB.created_at)
            .all()
        )
        return [models.RequirementDocument.model_validate(db_doc) for db_doc in db_docs]

    def delete(self, document_id: str) -> bool:
        """Delete a requirement document by its ID."""
        db_doc = (
            self.db.query(tables.RequirementDocumentDB)
            .filter(tables.RequirementDocumentDB.id == document_id)
            .first()
        )
        if not db_doc:
            return False

        self.db.delete(db_doc)
        self.db.commit()
        return True

    def get_by_key(
        self, document_key: str, organization_id: str
    ) -> Optional[models.RequirementDocument]:
        """Get a requirement document by its document_key."""
        db_doc = (
            self.db.query(tables.RequirementDocumentDB)
            .filter(
                tables.RequirementDocumentDB.document_key == document_key,
                tables.RequirementDocumentDB.organization_id == organization_id,
            )
            .first()
        )
        if not db_doc:
            return None
        return models.RequirementDocument.model_validate(db_doc)
