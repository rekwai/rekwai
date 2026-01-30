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
  createdAt: string;
  updatedAt: string;
  created?: string;
  description: string;
  decisionType: string;
  product_id: string;
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

export interface LLMSimilarityResult {
  is_similar: boolean;
  similarity_score: number;
  justification: string;
}

export interface SimilarRequirementBase {
  id: string;
  requirement_key: string;
  description: string;
  types: string[];
  implementation_description: string;
  implementation_status: ImplementationStatus;
  distance: number;
}

export interface SimilarRequirementWithLLM extends SimilarRequirementBase {
  llm_result: LLMSimilarityResult | null;
}

export interface MergedRequirement {
  description: string;
  types: string[];
  implementation_status: string;
  implementation_description: string;
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
  extraction_timestamp: string;
  order: number;
}

export interface ExtractedRequirementUpdate {
  description: string;
  types: string[];
  implementation_status: ImplementationStatus;
  implementation_description: string;
  requirement_verification: string;
}
