ALTER TABLE public.requirement_history
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
