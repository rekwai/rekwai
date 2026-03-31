ALTER TABLE requirement_link_extraction
  DROP COLUMN link_type;

ALTER TABLE requirement_history
  DROP COLUMN source_extracted_requirement_id,
  DROP COLUMN source_document_id;
