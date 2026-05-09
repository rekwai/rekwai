import {
  Requirement,
  CreateRequirementPayload,
  RequirementUpdate,
  MergedRequirement,
  RequirementHistory,
  ExtractedRequirementDto,
  SuggestedAction,
  SuggestedActionType,
  LinkType,
} from "../../types/requirement-types";
import { QuestionAnswer, QuestionRequest } from "../../types/query-types";

import { getApiUrl } from "@/lib/config/global-config";
import { handleResponse, parseApiError } from "@/lib/api/fetch-utils";

export { pollTaskStatus, type TaskStatus } from "@/lib/api/task-utils";

export async function createRequirement(
  requirement: CreateRequirementPayload,
): Promise<Requirement> {
  const response = await fetch(`${getApiUrl()}/requirements/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requirement),
  });

  return handleResponse<Requirement>(response);
}

export async function getRequirement(id: string): Promise<Requirement> {
  const response = await fetch(`${getApiUrl()}/requirements/${id}`);
  return handleResponse<Requirement>(response);
}

export async function getRequirementByKey(
  requirementKey: string,
): Promise<Requirement> {
  const response = await fetch(
    `${getApiUrl()}/requirements/key/${requirementKey}`,
  );
  return handleResponse<Requirement>(response);
}

export async function listRequirements(
  productId: string,
): Promise<Requirement[]> {
  const response = await fetch(
    `${getApiUrl()}/requirements/?product_id=${productId}`,
  );
  return handleResponse<Requirement[]>(response);
}
export async function updateRequirement(
  id: string,
  requirement: RequirementUpdate,
): Promise<Requirement> {
  const response = await fetch(`${getApiUrl()}/requirements/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requirement),
  });

  return handleResponse<Requirement>(response);
}

export async function getDistinctRequirementTypes(): Promise<string[]> {
  const response = await fetch(`${getApiUrl()}/requirements/types`);
  return handleResponse<string[]>(response);
}

export async function deleteRequirement(id: string): Promise<Requirement> {
  const response = await fetch(`${getApiUrl()}/requirements/${id}`, {
    method: "DELETE",
  });
  return handleResponse<Requirement>(response);
}

export async function getRequirementHistory(
  id: string,
): Promise<RequirementHistory[]> {
  const response = await fetch(`${getApiUrl()}/requirements/${id}/history`);
  return handleResponse<RequirementHistory[]>(response);
}
export async function getSuggestedAction(
  extractedRequirementId: string,
  excludeIds?: string[],
): Promise<SuggestedAction> {
  const url = new URL(
    `${getApiUrl()}/requirements/extracted-requirement/${extractedRequirementId}/suggest-action`,
  );

  if (excludeIds && excludeIds.length > 0) {
    excludeIds.forEach((id) => {
      url.searchParams.append("exclude_req", id);
    });
  }

  const response = await fetch(url.toString());
  return handleResponse<SuggestedAction>(response);
}

// --- Integration API Functions ---

/**
 * Answers a question based on relevant main requirements for a specific product.
 * @param request - QuestionRequest containing question and optional context IDs
 * @returns A promise resolving to a QuestionAnswer object
 */
export async function answerQuestion(
  request: QuestionRequest,
): Promise<QuestionAnswer> {
  const response = await fetch(`${getApiUrl()}/requirements/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  return handleResponse<QuestionAnswer>(response);
}

// --- Async Upload API Functions ---

/**
 * Uploads a file for async requirement extraction
 * @param file - The file to upload
 * @param productId - The product ID
 * @returns Promise resolving to task creation response with task_id
 */
export async function uploadRequirementsAsync(
  file: File,
  productId: string,
): Promise<{ task_id: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("product_id", productId);

  const response = await fetch(`${getApiUrl()}/requirements/upload-async`, {
    method: "POST",
    body: formData,
  });

  return handleResponse<{ task_id: string }>(response);
}

/**
 * Document with requirements response interface
 */
export interface DocumentWithRequirements {
  id: string;
  product_id: string;
  original_filename: string;
  file_extension: string;
  content_size_bytes: number;
  document_key: string;
  type: string;
  created_at: string;
  requirements: Array<{
    id: string;
    description: string;
    types: string[];
    implementation_status: string;
    implementation_description: string;
    extraction_timestamp: string;
    requirement_verification: string | null;
    order: number;
    has_links: boolean;
    link_type?: string | null;
    suggested_action?: SuggestedActionType | null;
    suggested_target_requirement_id?: string | null;
    suggestion_justification?: string | null;
    suggestion_similarity_score?: number | null;
    suggested_target_requirement?: Requirement | null;
    merge_preview?: MergedRequirement | null;
  }>;
}

/**
 * Document list response interface
 */
export interface RequirementDocument {
  id: string;
  product_id: string;
  original_filename: string;
  file_extension: string;
  content_size_bytes: number;
  document_key: string;
  type: string;
  created_at: string;
  requirements_count: number;
  linked_requirements_count: number;
  created_requirements_count?: number;
  merged_requirements_count?: number;
}

/**
 * Gets all requirement documents for a product
 * @param productId - The product ID
 * @returns Promise resolving to list of requirement documents
 */
export async function getRequirementDocuments(
  productId: string,
): Promise<RequirementDocument[]> {
  const response = await fetch(
    `${getApiUrl()}/requirements/document?product_id=${productId}`,
  );
  return handleResponse<RequirementDocument[]>(response);
}

/**
 * Gets document with its requirements by document key
 * @param documentKey - The document key
 * @returns Promise resolving to document with requirements
 */
export async function getDocumentWithRequirements(
  documentKey: string,
): Promise<DocumentWithRequirements> {
  const response = await fetch(
    `${getApiUrl()}/requirements/document/key/${documentKey}`,
  );
  return handleResponse<DocumentWithRequirements>(response);
}

/**
 * Downloads a document file
 * @param documentId - The document ID (UUID)
 * @returns Promise resolving to the file blob
 */
export async function downloadDocument(documentId: string): Promise<Blob> {
  const response = await fetch(
    `${getApiUrl()}/requirements/document/${documentId}/download`,
  );

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message);
  }

  return response.blob();
}

/**
 * Deletes a document and all its related data
 * @param documentId - The document ID (UUID)
 * @returns Promise resolving to success message
 */
export async function deleteDocument(
  documentId: string,
): Promise<{ message: string }> {
  const response = await fetch(
    `${getApiUrl()}/requirements/document/${documentId}`,
    {
      method: "DELETE",
    },
  );
  return handleResponse<{ message: string }>(response);
}

/**
 * Creates a question link for a requirement
 * @param requirementId - The requirement ID
 * @param questionId - The question ID to link
 * @returns Promise resolving to the created link
 */
export async function createQuestionLink(
  requirementId: string,
  questionId: string,
): Promise<void> {
  const response = await fetch(
    `${getApiUrl()}/requirements/${requirementId}/question-links`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_id: questionId,
      }),
    },
  );

  return handleResponse<void>(response);
}

/**
 * Deletes a question link from a requirement
 * @param requirementId - The requirement ID
 * @param questionId - The question ID to unlink
 * @returns Promise resolving to void
 */
export async function deleteQuestionLink(
  requirementId: string,
  questionId: string,
): Promise<void> {
  const response = await fetch(
    `${getApiUrl()}/requirements/${requirementId}/question-links/${questionId}`,
    {
      method: "DELETE",
    },
  );
  return handleResponse<void>(response);
}

/**
 * Creates an extraction link for a requirement
 * @param requirementId - The requirement ID
 * @param extractedRequirementId - The extracted requirement ID to link
 * @returns Promise resolving to void
 */
export async function createExtractionLink(
  requirementId: string,
  extractedRequirementId: string,
  linkType?: LinkType,
): Promise<void> {
  const response = await fetch(
    `${getApiUrl()}/requirements/${requirementId}/extraction-links`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        extracted_requirement_id: extractedRequirementId,
        link_type: linkType,
      }),
    },
  );

  return handleResponse<void>(response);
}

/**
 * Deletes an extraction link from a requirement
 * @param requirementId - The requirement ID
 * @param extractedRequirementId - The extracted requirement ID to unlink
 * @returns Promise resolving to void
 */
export async function deleteExtractionLink(
  requirementId: string,
  extractedRequirementId: string,
): Promise<void> {
  const response = await fetch(
    `${getApiUrl()}/requirements/${requirementId}/extraction-links/${extractedRequirementId}`,
    {
      method: "DELETE",
    },
  );
  return handleResponse<void>(response);
}

/**
 * Gets extraction links for an extracted requirement
 * @param extractedRequirementId - The extracted requirement ID
 * @returns Promise resolving to list of requirement IDs
 */
export async function listExtractedRequirementLinks(
  extractedRequirementId: string,
): Promise<string[]> {
  const response = await fetch(
    `${getApiUrl()}/requirements/extracted-requirement/${extractedRequirementId}/links`,
  );
  return handleResponse<string[]>(response);
}

/**
 * Generates a merged requirement from an extracted requirement and main requirement
 * @param extractedRequirementId - The extracted requirement ID
 * @param requirementId - The main requirement ID
 * @returns Promise resolving to merged requirement data
 */
export async function generateMerge(
  extractedRequirementId: string,
  requirementId: string,
): Promise<MergedRequirement> {
  const response = await fetch(
    `${getApiUrl()}/requirements/extracted-requirement/${extractedRequirementId}/generate-merge/${requirementId}`,
  );
  return handleResponse<MergedRequirement>(response);
}

/**
 * Accepts the AI suggestion for an extracted requirement.
 * For attach/merge: creates the extraction link and clears suggestion.
 * For create_new: just clears suggestion.
 */
export interface BulkAcceptSuggestionItem {
  extracted_requirement_id: string;
  status: "accepted" | "skipped" | "failed";
  action?: SuggestedActionType | null;
  reason?:
    | "already_linked"
    | "no_suggestion"
    | "invalidated_duplicate"
    | "missing_target"
    | "missing_merge_preview"
    | "unsupported_action"
    | "error"
    | null;
  requirement_id?: string | null;
  invalidated_ids: string[];
  message?: string | null;
}

export interface BulkAcceptSuggestionsResult {
  accepted: number;
  failed: number;
  skipped: number;
  already_linked: number;
  no_suggestion: number;
  invalidated_duplicate: number;
  items: BulkAcceptSuggestionItem[];
}

export async function acceptSuggestion(
  extractedRequirementId: string,
): Promise<{
  action: SuggestedActionType;
  target_requirement_id: string | null;
  invalidated_ids: string[];
}> {
  const response = await fetch(
    `${getApiUrl()}/requirements/extracted-requirement/${extractedRequirementId}/accept-suggestion`,
    { method: "POST" },
  );
  return handleResponse<{
    action: SuggestedActionType;
    target_requirement_id: string | null;
    invalidated_ids: string[];
  }>(response);
}

/**
 * Dismisses the AI suggestion for an extracted requirement.
 */
export async function bulkAcceptSuggestions(
  documentId: string,
): Promise<BulkAcceptSuggestionsResult> {
  const response = await fetch(
    `${getApiUrl()}/requirements/document/${documentId}/accept-suggestions`,
    { method: "POST" },
  );
  return handleResponse<BulkAcceptSuggestionsResult>(response);
}

export async function dismissSuggestion(
  extractedRequirementId: string,
): Promise<{ status: string }> {
  const response = await fetch(
    `${getApiUrl()}/requirements/extracted-requirement/${extractedRequirementId}/dismiss-suggestion`,
    { method: "POST" },
  );
  return handleResponse<{ status: string }>(response);
}

export async function undoMerge(
  extractedRequirementId: string,
  requirementId: string,
  suggestionRestore?: {
    suggested_action?: string;
    suggested_target_requirement_id?: string | null;
    suggestion_justification?: string | null;
    suggestion_similarity_score?: number | null;
    merge_preview?: MergedRequirement | null;
  },
): Promise<{
  status: string;
  restored_requirement: Record<string, unknown>;
  invalidated_ids: string[];
}> {
  const response = await fetch(
    `${getApiUrl()}/requirements/extracted-requirement/${extractedRequirementId}/undo-merge/${requirementId}`,
    {
      method: "POST",
      headers: suggestionRestore
        ? { "Content-Type": "application/json" }
        : {},
      body: suggestionRestore ? JSON.stringify(suggestionRestore) : undefined,
    },
  );
  return handleResponse<{
    status: string;
    restored_requirement: Record<string, unknown>;
    invalidated_ids: string[];
  }>(response);
}

/**
 * Updates an extracted requirement by ID
 * @param extractedRequirementId - The extracted requirement ID
 * @param update - Partial fields to update (description, types, requirement_verification, implementation_status, implementation_description)
 */
export async function updateExtractedRequirement(
  extractedRequirementId: string,
  update: Partial<{
    description: string;
    types: string[];
    requirement_verification: string | null;
    implementation_status: string | null;
    implementation_description: string | null;
  }>,
): Promise<ExtractedRequirementDto> {
  const response = await fetch(
    `${getApiUrl()}/requirements/extracted-requirement/${extractedRequirementId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    },
  );
  return handleResponse<ExtractedRequirementDto>(response);
}
