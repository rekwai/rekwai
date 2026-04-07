// frontend/lib/api/questionnaires.ts

import {
  QuestionnaireQuestion,
  QuestionGeneratedRequirement,
  AnswerType,
} from "@/types/query-types";
import { SimilarRequirementWithLLM } from "@/types/requirement-types";

import { getApiUrl } from "@/lib/config/global-config";
import { fetchApi, parseApiError } from "@/lib/api/fetch-utils";

// Re-export task utilities for backward compatibility with existing imports
export { pollTaskStatus, type TaskStatus } from "@/lib/api/task-utils";

/**
 * Downloads the questionnaire as a PDF by calling the backend export endpoint.
 * @param questionnaireId - The ID of the questionnaire.
 */
export const downloadQuestionnairePdf = async (
  questionnaireId: string | null,
  options?: { includeLinkedRequirements?: boolean },
): Promise<void> => {
  if (!questionnaireId) {
    throw new Error("Cannot export PDF: questionnaireId is null or undefined");
  }
  const params = new URLSearchParams();
  if (options?.includeLinkedRequirements !== undefined) {
    params.set(
      "include_linked_requirements",
      String(options.includeLinkedRequirements),
    );
  }
  const query = params.toString();
  const url = `${getApiUrl()}/questionnaires/${questionnaireId}/export/pdf${query ? `?${query}` : ""}`;
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message);
  }
  const blob = await response.blob();
  const filename = `questionnaire_${questionnaireId}.pdf`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
};

/**
 * Fetches the requirement links for a specific question.
 * @param questionId - The ID of the question.
 * @returns A promise resolving to an array of requirement ID strings.
 */
export const getQuestionRequirementLinks = async (
  questionId: string,
): Promise<string[]> => {
  const url = `${getApiUrl()}/questionnaires/questions/${questionId}/requirement-links`;
  return fetchApi<string[]>(url, {
    method: "GET",
  });
};

/**
 * Fetches questionnaire details by key.
 * @param questionnaireKey - The key of the questionnaire.
 * @returns A promise resolving to a QuestionnaireDetails object.
 */
export const getQuestionnaireDetails = async (
  questionnaireKey: string,
): Promise<QuestionnaireDetails> => {
  const url = `${getApiUrl()}/questionnaires/key/${questionnaireKey}/details`;
  return fetchApi<QuestionnaireDetails>(url, {
    method: "GET",
  });
};

/**
 * Fetches the questions for a specific questionnaire by key.
 * @param questionnaireKey - The key of the questionnaire.
 * @returns A promise resolving to an array of QuestionnaireQuestion objects.
 */
export const getQuestionnaireQuestions = async (
  questionnaireKey: string,
): Promise<QuestionnaireQuestion[]> => {
  const url = `${getApiUrl()}/questionnaires/key/${questionnaireKey}/questions`;
  return fetchApi<QuestionnaireQuestion[]>(url, {
    method: "GET",
  });
};

// --- New Function to Fetch Questionnaire List ---

// Define the expected response structure based on backend Pydantic models
export interface QuestionnaireSummary {
  id: string;
  key: string | null;
  client_name: string;
  file_name: string;
  uploaded_at: string; // Assuming ISO string format from backend
  total_questions: number;
  answered_questions: number;
}

export interface QuestionnaireDetails {
  id: string;
  key: string | null;
  product_id: string;
  client_name: string;
  uploaded_at: string;
}

/**
 * Fetches a list of all questionnaires for a specific product with summary information.
 * @param productId - The ID of the product to filter questionnaires by.
 * @returns A promise resolving to an array of QuestionnaireSummary objects.
 */
export const listQuestionnaires = async (
  productId: string,
): Promise<QuestionnaireSummary[]> => {
  const url = `${getApiUrl()}/questionnaires/?product_id=${productId}`;
  const response = await fetchApi<QuestionnaireSummary[]>(url, {
    method: "GET",
  });
  return response;
};

// --- New Function to Upload Questionnaire Document and Extract Questions ---

/**
 * Uploads a questionnaire document and initiates question extraction asynchronously.
 * @param file - The questionnaire document file.
 * @param clientId - The ID of the client associated with the questionnaire.
 * @param productId - The ID of the product this questionnaire belongs to.
 * @returns A promise resolving to the task ID for tracking progress.
 */
export const uploadQuestionnaireDocumentAsync = async (
  file: File,
  clientId: string,
  productId: string,
): Promise<{ task_id: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("client_id", clientId);
  formData.append("product_id", productId);

  const url = `${getApiUrl()}/questionnaires/upload-async`;
  return fetchApi<{ task_id: string }>(url, {
    method: "POST",
    body: formData,
  });
};

/**
 * Deletes an entire questionnaire by its UUID.
 * @param questionnaireId - The UUID of the questionnaire to delete.
 * @returns A promise resolving to the summary of the deleted questionnaire (or null if fetchApi returns null for 204).
 */
export const deleteQuestionnaire = async (
  questionnaireId: string,
): Promise<QuestionnaireSummary | null> => {
  const url = `${getApiUrl()}/questionnaires/${questionnaireId}`;
  // Assuming fetchApi handles 204 No Content by returning null,
  // or throws an error for other non-ok statuses.
  // The backend returns the deleted object summary on success (200 OK).
  return fetchApi<QuestionnaireSummary>(url, {
    method: "DELETE",
  });
};
/**
 * Deletes a specific questionnaire question.
 * @param questionId - The UUID of the question to delete.
 * @returns A promise resolving to the deleted QuestionnaireQuestion object (or null if fetchApi returns null for 204).
 */
export const deleteQuestionnaireQuestion = async (
  questionId: string,
): Promise<QuestionnaireQuestion | null> => {
  const url = `${getApiUrl()}/questionnaires/questions/${questionId}`;
  // Assuming fetchApi handles 204 No Content by returning null,
  // or throws an error for other non-ok statuses.
  // The backend returns the deleted object on success (200 OK).
  return fetchApi<QuestionnaireQuestion>(url, {
    method: "DELETE",
  });
};
/**
 * Saves an answer for a specific questionnaire question.
 * This endpoint is called after generating an answer via /requirements/answer
 * when context_sufficient is true.
 * @param questionId - The UUID of the question.
 * @param answer - The answer string to save.
 * @param answerType - Optional classification of the answer (yes/no/n/a).
 * @returns A promise resolving to the updated QuestionnaireQuestion object.
 */
export const saveQuestionAnswer = async (
  questionId: string,
  answer: string,
  answerType?: AnswerType,
): Promise<QuestionnaireQuestion> => {
  const url = `${getApiUrl()}/questionnaires/questions/${questionId}/save_answer`;
  return fetchApi<QuestionnaireQuestion>(url, {
    method: "POST",
    body: JSON.stringify({ answer, answer_type: answerType }),
  });
};

/**
 * Downloads a questionnaire file
 * @param questionnaireId - The questionnaire ID (UUID)
 * @returns Promise resolving to the file blob
 */
export async function downloadQuestionnaire(
  questionnaireId: string,
): Promise<Blob> {
  const response = await fetch(
    `${getApiUrl()}/questionnaires/${questionnaireId}/download`,
  );

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message);
  }

  return response.blob();
}

/**
 * Generates a requirement from a questionnaire question using AI.
 * @param questionId - The UUID of the question.
 * @returns A promise resolving to the generated requirement data.
 */
export const generateRequirementFromQuestion = async (
  questionId: string,
): Promise<QuestionGeneratedRequirement> => {
  const url = `${getApiUrl()}/questionnaires/questions/${questionId}/generate-requirement`;
  return fetchApi<QuestionGeneratedRequirement>(url, {
    method: "GET",
  });
};

/**
 * Creates a new question for a questionnaire.
 * @param questionnaireId - The UUID of the questionnaire.
 * @param questionText - The text of the new question.
 * @returns A promise resolving to the created QuestionnaireQuestion.
 */
export const addQuestionnaireQuestion = async (
  questionnaireId: string,
  questionText: string,
): Promise<QuestionnaireQuestion> => {
  const url = `${getApiUrl()}/questionnaires/${questionnaireId}/questions`;
  return fetchApi<QuestionnaireQuestion>(url, {
    method: "POST",
    body: JSON.stringify({
      questionnaire_id: questionnaireId,
      question_text: questionText,
    }),
  });
};

/**
 * Updates an existing questionnaire question.
 * @param questionId - The UUID of the question.
 * @param updates - Object containing fields to update.
 * @returns A promise resolving to the updated QuestionnaireQuestion.
 */
export const updateQuestionnaireQuestion = async (
  questionId: string,
  updates: {
    question_text?: string;
    answer?: string;
    answer_type?: AnswerType;
  },
): Promise<QuestionnaireQuestion> => {
  const url = `${getApiUrl()}/questionnaires/questions/${questionId}`;
  return fetchApi<QuestionnaireQuestion>(url, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
};

/**
 * Get similar requirements for a question.
 * @param questionId - The UUID of the question.
 * @param limit - Maximum number of similar requirements to return (default: 3).
 * @param filterReqs - Optional list of requirement IDs to exclude from results.
 * @returns A promise resolving to an array of similar requirements with LLM comparison.
 */
export const getSimilarRequirementsForQuestion = async (
  questionId: string,
  limit: number = 3,
  filterReqs?: string[],
): Promise<SimilarRequirementWithLLM[]> => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (filterReqs && filterReqs.length > 0) {
    filterReqs.forEach((id) => params.append("filter_req", id));
  }
  const url = `${getApiUrl()}/questionnaires/questions/${questionId}/similar?${params.toString()}`;
  return fetchApi<SimilarRequirementWithLLM[]>(url, {
    method: "GET",
  });
};
