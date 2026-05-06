ALTER TABLE public.requirement_history
  DROP CONSTRAINT IF EXISTS requirement_history_source_action_check;

ALTER TABLE public.requirement_history
  DROP COLUMN source_action;
