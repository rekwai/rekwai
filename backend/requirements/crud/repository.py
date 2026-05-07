"""
Repository for requirements data access.
"""

from typing import List, Optional, TYPE_CHECKING

from sqlalchemy.orm import Session
from sqlalchemy import distinct

from . import models, tables

if TYPE_CHECKING:
    from ai.external_ai import ExternalAIService


class RequirementRepository:
    def __init__(self, db: Session):
        self.db = db

    def _log_history(
        self,
        change_type: str,
        requirement_id: str,
        product_id: str,
        previous_data: Optional[models.RequirementDto] = None,
        new_data: Optional[models.RequirementDto] = None,
        source_extracted_requirement_id: Optional[str] = None,
        source_document_id: Optional[str] = None,
        source_action: Optional[str] = None,
    ):
        history_entry = tables.RequirementHistoryDB(
            requirement_id=requirement_id,
            product_id=product_id,
            change_type=change_type,
            previous_description=previous_data.description if previous_data else None,
            previous_types=previous_data.types if previous_data else None,
            previous_requirement_verification=previous_data.requirement_verification
            if previous_data
            else None,
            previous_implementation_description=previous_data.implementation_description
            if previous_data
            else None,
            previous_implementation_status=previous_data.implementation_status
            if previous_data
            else None,
            new_description=new_data.description if new_data else None,
            new_types=new_data.types if new_data else None,
            new_requirement_verification=new_data.requirement_verification
            if new_data
            else None,
            new_implementation_description=new_data.implementation_description
            if new_data
            else None,
            new_implementation_status=new_data.implementation_status
            if new_data
            else None,
            source_extracted_requirement_id=source_extracted_requirement_id,
            source_document_id=source_document_id,
            source_action=source_action,
        )
        self.db.add(history_entry)

    def log_extraction_action(
        self,
        requirement_id: str,
        product_id: str,
        link_type: str,
        extracted_requirement_id: str,
        document_id: str,
        previous_data: Optional[models.RequirementDto] = None,
        new_data: Optional[models.RequirementDto] = None,
        commit: bool = True,
    ):
        """Log a history entry for an extraction-related action (attach, merge, create)."""
        change_type_map = {
            "attach": "UPDATE",
            "merge": "UPDATE",
            "create": "CREATE",
        }
        change_type = change_type_map[link_type]
        self._log_history(
            change_type=change_type,
            requirement_id=requirement_id,
            product_id=product_id,
            previous_data=previous_data,
            new_data=new_data,
            source_extracted_requirement_id=extracted_requirement_id,
            source_document_id=document_id,
            source_action=link_type,
        )
        self.db.flush()
        if commit:
            self.db.commit()

    def tag_latest_extraction_history(
        self,
        requirement_id: str,
        change_type: str,
        extracted_requirement_id: str,
        document_id: str,
        require_previous_state: bool = False,
        commit: bool = True,
        source_action: Optional[str] = None,
    ) -> bool:
        """Attach extraction provenance to the latest matching history row."""
        query = self.db.query(tables.RequirementHistoryDB).filter(
            tables.RequirementHistoryDB.requirement_id == requirement_id,
            tables.RequirementHistoryDB.change_type == change_type,
        )
        if require_previous_state:
            query = query.filter(
                tables.RequirementHistoryDB.previous_description.isnot(None)
            )

        history_entry = query.order_by(
            tables.RequirementHistoryDB.change_timestamp.desc()
        ).first()
        if not history_entry:
            return False

        history_entry.source_extracted_requirement_id = extracted_requirement_id
        history_entry.source_document_id = document_id
        history_entry.source_action = source_action
        self.db.flush()
        if commit:
            self.db.commit()
        return True

    def record_extraction_link_history(
        self,
        requirement_id: str,
        link_type: str,
        extracted_requirement_id: str,
        commit: bool = True,
    ) -> None:
        """Record import provenance for a created requirement-extraction link."""
        db_extracted_req = self.get_extracted_requirement_by_id(extracted_requirement_id)
        if not db_extracted_req:
            raise ValueError("Extracted requirement not found")

        if link_type == "create":
            tagged = self.tag_latest_extraction_history(
                requirement_id=requirement_id,
                change_type="CREATE",
                extracted_requirement_id=extracted_requirement_id,
                document_id=str(db_extracted_req.document_id),
                commit=False,
                source_action=link_type,
            )
        elif link_type == "merge":
            tagged = self.tag_latest_extraction_history(
                requirement_id=requirement_id,
                change_type="UPDATE",
                extracted_requirement_id=extracted_requirement_id,
                document_id=str(db_extracted_req.document_id),
                require_previous_state=True,
                commit=False,
                source_action=link_type,
            )
        elif link_type == "attach":
            main_req = self.get(requirement_id)
            self.log_extraction_action(
                requirement_id=requirement_id,
                product_id=str(db_extracted_req.product_id),
                link_type=link_type,
                extracted_requirement_id=extracted_requirement_id,
                document_id=str(db_extracted_req.document_id),
                new_data=main_req,
                commit=False,
            )
            tagged = True
        else:
            raise ValueError(f"Invalid extraction link type: {link_type}")

        if not tagged:
            raise RuntimeError("Expected requirement history entry was not found")

        if commit:
            self.db.commit()

    def _get_requirement_by_filters(self, **filters) -> Optional[tables.RequirementDB]:
        """Generic method to get a single requirement by any filters."""
        query = self.db.query(tables.RequirementDB)
        for key, value in filters.items():
            query = query.filter(getattr(tables.RequirementDB, key) == value)
        return query.first()

    def transform_to_dto(
        self, db_req: tables.RequirementDB, types: List[str] = None
    ) -> models.RequirementDto:
        """Transform RequirementDB to RequirementDto with types."""
        if types is None:
            # Query types from database if not provided
            types = [
                t[0]
                for t in self.db.query(tables.RequirementTypeDB.type)
                .filter(tables.RequirementTypeDB.requirement_id == db_req.id)
                .all()
            ]

        return models.RequirementDto(
            id=db_req.id,
            description=db_req.description,
            types=types,
            requirement_verification=db_req.requirement_verification,
            implementation_description=db_req.implementation_description,
            implementation_status=db_req.implementation_status,
            product_id=str(db_req.product_id),
            created_at=db_req.created_at,
            requirement_key=db_req.requirement_key,
        )

    def create(
        self,
        requirement_data: models.RequirementCreate,
        organization_id: str,
        requirement_key: str,
    ) -> models.RequirementDto:
        # Extract types from requirement data
        types = requirement_data.types
        requirement_dict = requirement_data.model_dump()
        del requirement_dict["types"]  # Remove types before creating RequirementDB

        # Create the requirement record
        db_req = tables.RequirementDB(
            **requirement_dict,
            organization_id=organization_id,
            requirement_key=requirement_key,
        )
        self.db.add(db_req)
        self.db.flush()
        self.db.refresh(db_req)

        # Create type entries (dedupe to prevent unique constraint violations)
        for req_type in set(types):
            type_entry = tables.RequirementTypeDB(
                requirement_id=db_req.id, type=req_type
            )
            self.db.add(type_entry)

        # Transform to DTO with types
        new_req_dto = self.transform_to_dto(db_req, types)
        self._log_history(
            "CREATE", new_req_dto.id, new_req_dto.product_id, new_data=new_req_dto
        )
        self.db.commit()
        return new_req_dto

    def get(self, requirement_id: str) -> Optional[models.RequirementDto]:
        db_req = self._get_requirement_by_filters(id=requirement_id)
        return self.transform_to_dto(db_req) if db_req else None

    def get_by_key(
        self, requirement_key: str, organization_id: str
    ) -> Optional[models.RequirementDto]:
        """Get a requirement by its requirement_key and organization_id."""
        db_req = self._get_requirement_by_filters(
            requirement_key=requirement_key, organization_id=organization_id
        )
        return self.transform_to_dto(db_req) if db_req else None

    def list(
        self, product_id: str, skip: int = 0, limit: int = 100
    ) -> List[models.RequirementDto]:
        db_reqs = (
            self.db.query(tables.RequirementDB)
            .filter(tables.RequirementDB.product_id == product_id)
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [self.transform_to_dto(req) for req in db_reqs]

    def update(
        self,
        requirement_id: str,
        update_data: models.RequirementUpdate,
        new_embedding: Optional[List[float]] = None,
    ) -> Optional[models.RequirementDto]:
        db_req = (
            self.db.query(tables.RequirementDB)
            .filter(tables.RequirementDB.id == requirement_id)
            .first()
        )
        if not db_req:
            return None

        # Get previous state with types
        previous_data = self.transform_to_dto(db_req)

        # Update requirement fields (excluding types)
        update_dict = update_data.model_dump(exclude_unset=True)
        types_to_update = update_dict.pop("types", None)

        for key, value in update_dict.items():
            setattr(db_req, key, value)
        if new_embedding:
            db_req.embedding = new_embedding

        # Handle type updates if provided
        if types_to_update is not None:
            # Remove existing types
            self.db.query(tables.RequirementTypeDB).filter(
                tables.RequirementTypeDB.requirement_id == requirement_id
            ).delete()

            # Add new types (dedupe to prevent unique constraint violations)
            unique_types = set(types_to_update)
            for req_type in unique_types:
                type_entry = tables.RequirementTypeDB(
                    requirement_id=requirement_id, type=req_type
                )
                self.db.add(type_entry)

            new_types = list(unique_types)
        else:
            new_types = previous_data.types

        self.db.flush()
        self.db.refresh(db_req)

        # Create new DTO with updated types
        new_data = self.transform_to_dto(db_req, new_types)
        self._log_history(
            "UPDATE",
            requirement_id,
            db_req.product_id,
            previous_data=previous_data,
            new_data=new_data,
        )
        self.db.commit()
        return new_data

    def delete(self, requirement_id: str) -> Optional[models.RequirementDto]:
        db_req = (
            self.db.query(tables.RequirementDB)
            .filter(tables.RequirementDB.id == requirement_id)
            .first()
        )
        if not db_req:
            return None

        # Get the requirement with types before deletion
        deleted_req = self.transform_to_dto(db_req)

        # Delete related records (types will be deleted by CASCADE)
        self.db.query(tables.RequirementHistoryDB).filter(
            tables.RequirementHistoryDB.requirement_id == requirement_id
        ).delete()
        self.db.delete(db_req)
        self.db.commit()
        return deleted_req

    def get_distinct_types(self, organization_id: str) -> List[str]:
        return [
            t[0]
            for t in self.db.query(distinct(tables.RequirementTypeDB.type))
            .join(
                tables.RequirementDB,
                tables.RequirementTypeDB.requirement_id == tables.RequirementDB.id,
            )
            .filter(tables.RequirementDB.organization_id == organization_id)
            .all()
        ]

    def find_similar(
        self,
        embedding: List[float],
        product_id: str,
        limit: int = 3,
        filter_reqs: Optional[List[str]] = None,
    ) -> List[tables.RequirementDB]:
        if not embedding:
            return []

        query = self.db.query(tables.RequirementDB).filter(
            tables.RequirementDB.embedding.isnot(None),
            tables.RequirementDB.product_id == product_id,
        )

        # Apply filters if provided - exclude requirements with IDs in the filter list
        if filter_reqs:
            query = query.filter(~tables.RequirementDB.id.in_(filter_reqs))

        results = (
            query.order_by(tables.RequirementDB.embedding.l2_distance(embedding))
            .limit(limit)
            .all()
        )
        return results

    async def search_semantic(
        self,
        query: str,
        product_id: str,
        external_ai_service: "ExternalAIService",
        limit: int = 5,
    ) -> List[models.RequirementDto]:
        """Search requirements by semantic similarity to a query string.

        This is a convenience method for the question answering workflow that:
        1. Generates an embedding from the query text
        2. Finds similar requirements using vector search
        3. Returns full RequirementDto objects (without distance scores)

        Args:
            query: The search query text
            product_id: Product ID to filter requirements
            external_ai_service: ExternalAIService instance for generating embeddings
            limit: Maximum number of results to return

        Returns:
            List of RequirementDto objects ordered by similarity
        """
        # Delegate to search_semantic_with_distances and discard distances
        results_with_distances = await self.search_semantic_with_distances(
            query=query,
            product_id=product_id,
            external_ai_service=external_ai_service,
            limit=limit,
        )

        # Return only the DTOs, discarding distance scores
        return [req_dto for req_dto, _ in results_with_distances]

    async def search_semantic_with_distances(
        self,
        query: str,
        product_id: str,
        external_ai_service: "ExternalAIService",
        limit: int = 5,
    ) -> List[tuple[models.RequirementDto, float]]:
        """Search requirements by semantic similarity with L2 distance scores.

        Similar to search_semantic, but returns tuples of (RequirementDto, distance)
        where distance is the L2 distance score (lower = more similar).

        Args:
            query: The search query text
            product_id: Product ID to filter requirements
            external_ai_service: ExternalAIService instance for generating embeddings
            limit: Maximum number of results to return

        Returns:
            List of (RequirementDto, distance) tuples ordered by similarity
        """
        if not query:
            return []

        # Generate embedding from query text
        embedding = await external_ai_service.create_embeddings(query)
        if not embedding:
            return []

        # Query with distance calculation
        query_obj = (
            self.db.query(
                tables.RequirementDB,
                tables.RequirementDB.embedding.l2_distance(embedding).label("distance"),
            )
            .filter(
                tables.RequirementDB.embedding.isnot(None),
                tables.RequirementDB.product_id == product_id,
            )
            .order_by("distance")
            .limit(limit)
        )

        results = query_obj.all()

        # Transform to (DTO, distance) tuples
        return [(self.transform_to_dto(req), distance) for req, distance in results]

    def search_regex(
        self,
        pattern: str,
        product_id: str,
        fields: List[str],
        limit: int = 10,
    ) -> List[models.RequirementDto]:
        """Search requirements using case-insensitive regex pattern across specified fields.

        Uses PostgreSQL's ~* operator for case-insensitive regex matching.

        Args:
            pattern: Regular expression pattern to search for
            product_id: Product ID to filter requirements
            fields: List of field names to search in (e.g., ["description", "implementation_description"])
            limit: Maximum number of results to return

        Returns:
            List of RequirementDto objects matching the pattern
        """
        if not pattern or not fields:
            return []

        from sqlalchemy import or_

        # Build OR conditions for all specified fields
        conditions = []
        for field in fields:
            if hasattr(tables.RequirementDB, field):
                field_col = getattr(tables.RequirementDB, field)
                # Use PostgreSQL ~* operator for case-insensitive regex
                conditions.append(field_col.op("~*")(pattern))

        if not conditions:
            return []

        # Query with OR conditions and product filter
        db_reqs = (
            self.db.query(tables.RequirementDB)
            .filter(
                tables.RequirementDB.product_id == product_id,
                or_(*conditions),
            )
            .limit(limit)
            .all()
        )

        # Transform to DTOs
        return [self.transform_to_dto(req) for req in db_reqs]

    def get_history(self, requirement_id: str) -> List[models.RequirementHistory]:
        history_db = (
            self.db.query(tables.RequirementHistoryDB)
            .filter(tables.RequirementHistoryDB.requirement_id == requirement_id)
            .order_by(tables.RequirementHistoryDB.change_timestamp.desc())
            .all()
        )
        return [models.RequirementHistory.model_validate(h) for h in history_db]

    def restore_from_latest_history(
        self,
        requirement_id: str,
        source_extracted_requirement_id: Optional[str] = None,
        source_action: Optional[str] = None,
    ) -> Optional[models.RequirementDto]:
        """Restore a requirement to its state before a matching UPDATE.

        Uses the previous_* fields from the latest matching history entry to revert.
        Optional source filters let callers restore a specific extraction action
        instead of any later unrelated edit.
        Returns the restored requirement DTO, or None if no history found.
        """
        query = self.db.query(tables.RequirementHistoryDB).filter(
            tables.RequirementHistoryDB.requirement_id == requirement_id,
            tables.RequirementHistoryDB.change_type == "UPDATE",
            tables.RequirementHistoryDB.previous_description.isnot(None),
        )
        if source_extracted_requirement_id is not None:
            query = query.filter(
                tables.RequirementHistoryDB.source_extracted_requirement_id
                == source_extracted_requirement_id
            )
        if source_action is not None:
            query = query.filter(
                tables.RequirementHistoryDB.source_action == source_action
            )

        history_entry = query.order_by(
            tables.RequirementHistoryDB.change_timestamp.desc()
        ).first()
        if not history_entry or history_entry.previous_description is None:
            return None
        if history_entry.previous_types is None:
            raise RuntimeError("Requirement history entry is missing previous_types")

        db_req = (
            self.db.query(tables.RequirementDB)
            .filter(tables.RequirementDB.id == requirement_id)
            .first()
        )
        if not db_req:
            return None

        # Capture current state before reverting
        current_data = self.transform_to_dto(db_req)

        # Restore previous fields
        db_req.description = history_entry.previous_description
        db_req.implementation_status = history_entry.previous_implementation_status
        db_req.implementation_description = (
            history_entry.previous_implementation_description
        )
        db_req.requirement_verification = (
            history_entry.previous_requirement_verification
        )

        # Restore previous types
        self.db.query(tables.RequirementTypeDB).filter(
            tables.RequirementTypeDB.requirement_id == requirement_id
        ).delete()
        for req_type in set(history_entry.previous_types):
            type_entry = tables.RequirementTypeDB(
                requirement_id=requirement_id, type=req_type
            )
            self.db.add(type_entry)

        self.db.flush()
        self.db.refresh(db_req)

        restored_data = self.transform_to_dto(db_req, history_entry.previous_types)

        # Log the revert as a new history entry
        self._log_history(
            "UPDATE",
            requirement_id,
            db_req.product_id,
            previous_data=current_data,
            new_data=restored_data,
        )
        # Flush only — caller is responsible for committing the transaction
        # so that undo_merge can atomically restore + delete link in one commit
        self.db.flush()
        return restored_data

    def create_extracted_requirement(
        self,
        extracted_requirement_data: models.ExtractedRequirement,
        document_id: str,
        organization_id: str,
        order: float,
    ) -> tables.ExtractedRequirementDB:
        """Create a new extracted requirement record in the database."""
        db_extracted_req = tables.ExtractedRequirementDB(
            document_name=extracted_requirement_data.document_name,
            description=extracted_requirement_data.description,
            requirement_verification=extracted_requirement_data.requirement_verification,
            implementation_status=extracted_requirement_data.implementation_status,
            implementation_description=extracted_requirement_data.implementation_description,
            document_id=document_id,
            organization_id=organization_id,
            product_id=extracted_requirement_data.product_id,
            order=order,
        )
        self.db.add(db_extracted_req)
        self.db.flush()
        self.db.refresh(db_extracted_req)

        # Add types to the extracted_requirement_type table (dedupe to prevent unique constraint violations)
        for req_type in set(extracted_requirement_data.types):
            type_entry = tables.ExtractedRequirementTypeDB(
                extracted_requirement_id=db_extracted_req.id, type=req_type
            )
            self.db.add(type_entry)

        self.db.commit()
        return db_extracted_req

    def get_extracted_requirements_by_document_id(
        self, document_id: str
    ) -> List[tables.ExtractedRequirementDB]:
        """Get all extracted requirements for a specific document, ordered by order field."""
        db_doc_reqs = (
            self.db.query(tables.ExtractedRequirementDB)
            .filter(tables.ExtractedRequirementDB.document_id == document_id)
            .order_by(tables.ExtractedRequirementDB.order)
            .all()
        )
        return db_doc_reqs

    def count_extracted_requirements_by_document_id(self, document_id: str) -> int:
        """Count the number of extracted requirements for a specific document."""
        count = (
            self.db.query(tables.ExtractedRequirementDB)
            .filter(tables.ExtractedRequirementDB.document_id == document_id)
            .count()
        )
        return count

    def get_extracted_requirement_types(
        self, extracted_requirement_id: str
    ) -> List[str]:
        """Get all types for a specific extracted requirement."""
        types = [
            t[0]
            for t in self.db.query(tables.ExtractedRequirementTypeDB.type)
            .filter(
                tables.ExtractedRequirementTypeDB.extracted_requirement_id
                == extracted_requirement_id
            )
            .all()
        ]
        return types

    def get_extracted_requirement_by_id(
        self, extracted_requirement_id: str
    ) -> Optional[tables.ExtractedRequirementDB]:
        """Get a specific extracted requirement by its ID."""
        return (
            self.db.query(tables.ExtractedRequirementDB)
            .filter(tables.ExtractedRequirementDB.id == extracted_requirement_id)
            .first()
        )

    def delete_extracted_requirement(self, extracted_requirement_id: str) -> bool:
        """Delete an extracted requirement (associated types deleted via CASCADE)."""
        db_extracted_req = (
            self.db.query(tables.ExtractedRequirementDB)
            .filter(tables.ExtractedRequirementDB.id == extracted_requirement_id)
            .first()
        )
        if not db_extracted_req:
            return False

        self.db.delete(db_extracted_req)
        self.db.commit()
        return True

    def update_extracted_requirement(
        self,
        extracted_requirement_id: str,
        update_data: models.ExtractedRequirementUpdate,
    ) -> Optional[tables.ExtractedRequirementDB]:
        """Update fields of an extracted requirement and optionally its types."""
        db_extracted_req = (
            self.db.query(tables.ExtractedRequirementDB)
            .filter(tables.ExtractedRequirementDB.id == extracted_requirement_id)
            .first()
        )
        if not db_extracted_req:
            return None

        update_dict = update_data.model_dump(exclude_unset=True)
        types_to_update = update_dict.pop("types", None)

        # Update simple fields
        for key, value in update_dict.items():
            setattr(db_extracted_req, key, value)

        # Update types if provided (replace all, dedupe to prevent unique constraint violations)
        if types_to_update is not None:
            self.db.query(tables.ExtractedRequirementTypeDB).filter(
                tables.ExtractedRequirementTypeDB.extracted_requirement_id
                == extracted_requirement_id
            ).delete()
            for req_type in set(types_to_update):
                self.db.add(
                    tables.ExtractedRequirementTypeDB(
                        extracted_requirement_id=extracted_requirement_id, type=req_type
                    )
                )

        self.db.flush()
        self.db.refresh(db_extracted_req)
        self.db.commit()
        return db_extracted_req

    def set_extracted_requirement_suggestion(
        self,
        extracted_requirement_id: str,
        action: Optional[str] = None,
        target_requirement_id: Optional[str] = None,
        justification: Optional[str] = None,
        similarity_score: Optional[float] = None,
        merge_preview: Optional[dict] = None,
        commit: bool = True,
    ) -> Optional[tables.ExtractedRequirementDB]:
        """Set or clear the AI suggestion on an extracted requirement row.

        Pass values to store a suggestion, or call with no arguments to clear.
        When action is None, all suggestion fields including merge_preview are cleared.
        When action is set, merge_preview is explicitly set to the provided value.
        """
        db_extracted_req = (
            self.db.query(tables.ExtractedRequirementDB)
            .filter(tables.ExtractedRequirementDB.id == extracted_requirement_id)
            .first()
        )
        if not db_extracted_req:
            return None

        db_extracted_req.suggested_action = action
        db_extracted_req.suggested_target_requirement_id = target_requirement_id
        db_extracted_req.suggestion_justification = justification
        db_extracted_req.suggestion_similarity_score = similarity_score
        db_extracted_req.merge_preview = merge_preview

        self.db.flush()
        self.db.refresh(db_extracted_req)
        if commit:
            self.db.commit()
        return db_extracted_req

    def find_extracted_requirements_by_suggestion_target(
        self,
        target_requirement_id: str,
        exclude_id: Optional[str] = None,
    ) -> List[tables.ExtractedRequirementDB]:
        """Find extracted requirements with merge suggestions targeting the given requirement.

        Args:
            target_requirement_id: The main requirement ID being targeted
            exclude_id: An extracted requirement ID to exclude (e.g., the just-approved one)

        Returns:
            List of ExtractedRequirementDB rows with merge suggestions to this target
        """
        query = self.db.query(tables.ExtractedRequirementDB).filter(
            tables.ExtractedRequirementDB.suggested_target_requirement_id
            == target_requirement_id,
            tables.ExtractedRequirementDB.suggested_action == "merge",
        )
        if exclude_id:
            query = query.filter(tables.ExtractedRequirementDB.id != exclude_id)
        return query.all()

    def set_extracted_requirement_merge_preview(
        self,
        extracted_requirement_id: str,
        preview_dict: dict,
    ) -> Optional[tables.ExtractedRequirementDB]:
        """Store the merge preview JSON on an extracted requirement."""
        db_extracted_req = (
            self.db.query(tables.ExtractedRequirementDB)
            .filter(tables.ExtractedRequirementDB.id == extracted_requirement_id)
            .first()
        )
        if not db_extracted_req:
            return None

        db_extracted_req.merge_preview = preview_dict

        self.db.flush()
        self.db.refresh(db_extracted_req)
        self.db.commit()
        return db_extracted_req
