ALTER TABLE public.requirement_link_extraction
  DROP COLUMN link_type;

ALTER TABLE public.requirement_history
  DROP COLUMN source_extracted_requirement_id,
  DROP COLUMN source_document_id;
