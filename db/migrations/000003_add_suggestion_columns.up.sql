ALTER TABLE extracted_requirement
  ADD COLUMN suggested_action varchar(20),
  ADD COLUMN suggested_target_requirement_id uuid REFERENCES requirement(id) ON DELETE SET NULL,
  ADD COLUMN suggestion_justification text,
  ADD COLUMN suggestion_similarity_score real;
