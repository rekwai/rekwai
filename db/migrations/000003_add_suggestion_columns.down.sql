ALTER TABLE public.extracted_requirement
  DROP COLUMN suggested_action,
  DROP COLUMN suggested_target_requirement_id,
  DROP COLUMN suggestion_justification,
  DROP COLUMN suggestion_similarity_score;
