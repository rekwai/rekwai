ALTER TABLE public.requirement_link_extraction
  ADD COLUMN link_type varchar(20);

ALTER TABLE public.requirement_history
  ADD COLUMN source_extracted_requirement_id uuid REFERENCES public.extracted_requirement(id) ON DELETE SET NULL,
  ADD COLUMN source_document_id uuid REFERENCES public.requirement_document(id) ON DELETE SET NULL;
