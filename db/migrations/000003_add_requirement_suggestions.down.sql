ALTER TABLE public.requirement_history
  DROP CONSTRAINT IF EXISTS requirement_history_source_action_check;

ALTER TABLE public.requirement_history
  DROP COLUMN source_action,
  DROP COLUMN source_extracted_requirement_id,
  DROP COLUMN source_document_id;

ALTER TABLE public.requirement_link_extraction
  DROP COLUMN link_type;

ALTER TABLE public.extracted_requirement
  DROP COLUMN merge_preview,
  DROP COLUMN suggested_action,
  DROP COLUMN suggested_target_requirement_id,
  DROP COLUMN suggestion_justification,
  DROP COLUMN suggestion_similarity_score;
