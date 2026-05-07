ALTER TABLE public.extracted_requirement
  ADD COLUMN suggested_action varchar(20),
  ADD COLUMN suggested_target_requirement_id uuid REFERENCES public.requirement(id) ON DELETE SET NULL,
  ADD COLUMN suggestion_justification text,
  ADD COLUMN suggestion_similarity_score real,
  ADD COLUMN merge_preview jsonb;

ALTER TABLE public.requirement_link_extraction
  ADD COLUMN link_type varchar(20);

ALTER TABLE public.requirement_history
  ADD COLUMN source_extracted_requirement_id uuid REFERENCES public.extracted_requirement(id) ON DELETE SET NULL,
  ADD COLUMN source_document_id uuid REFERENCES public.requirement_document(id) ON DELETE SET NULL,
  ADD COLUMN source_action varchar(20);

UPDATE public.requirement_history AS h
SET source_action = l.link_type
FROM public.requirement_link_extraction AS l
WHERE h.requirement_id = l.requirement_id
  AND h.source_extracted_requirement_id = l.extracted_requirement_id
  AND h.source_action IS NULL
  AND l.link_type IS NOT NULL;

ALTER TABLE public.requirement_history
  ADD CONSTRAINT requirement_history_source_action_check
  CHECK (source_action IS NULL OR source_action IN ('attach', 'merge', 'create'));
