from typing import Optional, List, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import update
from sqlalchemy.orm.attributes import InstrumentedAttribute

from . import tables, models


class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_product(self, product_id: str) -> Optional[tables.ProductDB]:
        return (
            self.db.query(tables.ProductDB)
            .filter(tables.ProductDB.id == product_id)
            .first()
        )

    def get_product_by_key_in_org(
        self, organization_id: str, product_key: str
    ) -> Optional[tables.ProductDB]:
        return (
            self.db.query(tables.ProductDB)
            .filter(
                tables.ProductDB.organization_id == organization_id,
                tables.ProductDB.product_key == product_key,
            )
            .first()
        )

    def get_products(self, skip: int = 0, limit: int = 100) -> List[tables.ProductDB]:
        return self.db.query(tables.ProductDB).offset(skip).limit(limit).all()

    def create_product(
        self, product: models.ProductCreate, organization_id: str
    ) -> tables.ProductDB:
        db_product = tables.ProductDB(
            name=product.name,
            organization_id=organization_id,
            product_key=product.product_key,
        )
        self.db.add(db_product)
        self.db.commit()
        self.db.refresh(db_product)
        return db_product

    def _increment_and_get_key(
        self, product_id: str, key_column: InstrumentedAttribute
    ) -> Tuple[int, str]:
        """Atomically increment a key column and return the new value with product key."""
        stmt = (
            update(tables.ProductDB)
            .where(tables.ProductDB.id == product_id)
            .values({key_column: key_column + 1})
            .returning(key_column, tables.ProductDB.product_key)
        )
        result = self.db.execute(stmt)
        row = result.fetchone()
        return row  # type: ignore[return-value]

    def increment_and_get_requirement_document_key(
        self, product_id: str
    ) -> Tuple[int, str]:
        """Atomically increment and get the document key number for a product."""
        return self._increment_and_get_key(
            product_id, tables.ProductDB.current_requirement_document_key_number
        )

    def increment_and_get_product_key(self, product_id: str) -> Tuple[int, str]:
        """Atomically increment and get the requirement key number for a product."""
        return self._increment_and_get_key(
            product_id, tables.ProductDB.current_requirement_key_number
        )

    def increment_and_get_questionnaire_key(self, product_id: str) -> Tuple[int, str]:
        """Atomically increment and get the questionnaire key number for a product."""
        return self._increment_and_get_key(
            product_id, tables.ProductDB.current_questionnaire_key_number
        )

    def update_product(
        self, db_product: tables.ProductDB, update_data: models.ProductUpdate
    ) -> tables.ProductDB:
        """Update a product with the given data."""
        if update_data.name is not None:
            db_product.name = update_data.name
        self.db.commit()
        self.db.refresh(db_product)
        return db_product

    def delete_product(self, db_product: tables.ProductDB) -> None:
        """Delete a product from the database."""
        self.db.delete(db_product)
        self.db.commit()
