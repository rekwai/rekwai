ALTER TABLE requirement_link_extraction
  ADD COLUMN link_type varchar(20);

ALTER TABLE requirement_history
  ADD COLUMN source_extracted_requirement_id uuid REFERENCES extracted_requirement(id) ON DELETE SET NULL,
  ADD COLUMN source_document_id uuid REFERENCES requirement_document(id) ON DELETE SET NULL;
