export type ImplementationStatus =
  | "Implemented"
  | "Planned"
  | "To do"
  | "Won't do";

export interface RequirementItem {
  id: string;
  text: string;
  types: string[];
  implementation: ImplementationStatus;
  implementationDescription?: string;
  requirementVerification?: string;
  hasLinks: boolean;
  linkType?: LinkType | null;
  createdAt: string;
  updatedAt: string;
  created?: string;
  description: string;
  decisionType: string;
  product_id: string;
  suggestedAction?: SuggestedActionType | null;
  suggestedTargetRequirementId?: string | null;
  suggestionJustification?: string | null;
  suggestionSimilarityScore?: number | null;
  suggestedTargetRequirement?: Requirement | null;
  mergePreview?: MergedRequirement | null;
}

export interface DocumentMetadata {
  key?: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
}

export interface Requirement {
  id: string;
  description: string;
  types: string[];
  requirement_verification?: string;
  implementation_description: string;
  implementation_status: ImplementationStatus;
  product_id: string;
  created_at: string;
  requirement_key: string;
}

export interface RequirementUpdate {
  description?: string;
  types?: string[];
  requirement_verification?: string;
  implementation_description?: string;
  implementation_status?: ImplementationStatus;
  product_id: string;
}

export type CreateRequirementPayload = Omit<
  Requirement,
  "id" | "created_at" | "requirement_key"
>;

export interface RequirementHistory {
  id: string;
  requirement_id: string;
  product_id: string;
  change_timestamp: string;
  change_type: "CREATE" | "UPDATE" | "DELETE";
  source_extracted_requirement_id: string | null;
  source_document_id: string | null;
  source_action: LinkType | null;
  user_id: string | null;
  previous_description: string | null;
  previous_types: string[] | null;
  previous_implementation_description: string | null;
  previous_implementation_status: string | null;
  new_description: string | null;
  new_types: string[] | null;
  new_implementation_description: string | null;
  new_implementation_status: string | null;
}

// Used by the questionnaire flow only (not the source document flow)
export interface LLMSimilarityResult {
  is_similar: boolean;
  similarity_score: number;
  justification: string;
}

// Used by the questionnaire flow only (not the source document flow)
export interface SimilarRequirementWithLLM extends Requirement {
  llm_result: LLMSimilarityResult | null;
}

export type LinkType = "attach" | "merge" | "create";

export type SuggestedActionType = "attach" | "merge" | "create_new";

export interface SuggestedAction {
  action: SuggestedActionType;
  target_requirement_id: string | null;
  target_requirement: Requirement | null;
  justification: string;
  similarity_score: number;
  merge_preview?: MergedRequirement | null;
}

export interface MergeInfo {
  extractedReqId: string;
  targetReqId: string;
  targetReqKey: string;
  mergedRequirement?: Requirement;
  previousSuggestion?: SuggestedAction;
}

export interface CreateInfo {
  extractedReqId: string;
  createdRequirement: Requirement;
  isLinked: boolean;
  previousSuggestion?: SuggestedAction;
}

export interface MergedRequirement {
  description: string;
  types: string[];
  implementation_status: string;
  implementation_description: string;
  requirement_verification: string;
}

export interface ExtractedRequirementDto {
  id: string;
  document_name: string;
  description: string;
  product_id: string;
  types: string[];
  requirement_verification?: string | null;
  implementation_status?: string | null;
  implementation_description?: string | null;
  has_links: boolean;
  link_type?: string | null;
  extraction_timestamp: string;
  order: number;
  suggested_action?: SuggestedActionType | null;
  suggested_target_requirement_id?: string | null;
  suggestion_justification?: string | null;
  suggestion_similarity_score?: number | null;
  suggested_target_requirement?: Requirement | null;
  merge_preview?: MergedRequirement | null;
}

export interface ExtractedRequirementUpdate {
  description: string;
  types: string[];
  implementation_status: ImplementationStatus;
  implementation_description: string;
  requirement_verification: string;
}
