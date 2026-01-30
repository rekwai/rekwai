/**
 * Possible statuses for a question review.
 */
export type ReviewStatus = "approved" | "rejected" | "modified" | "pending"; // Added 'pending' as a likely initial state

/**
 * Answer type classification for questionnaire questions.
 * - "yes": Feature is implemented
 * - "no": Feature is not implemented
 * - "n/a": Not applicable to this product
 * - null: No requirements found / needs user input
 */
export type AnswerType = "yes" | "no" | "n/a" | null;

/**
 * Represents a questionnaire question fetched from the backend.
 * Matches the backend Pydantic model `QuestionnaireQuestion`.
 */
export interface QuestionnaireQuestion {
  id: string; // UUID represented as string
  questionnaire_id: string; // UUID represented as string to match backend
  question_text: string;
  status: string; // e.g., 'extracted', 'answered', 'reviewed', 'rejected'
  generated_answer: string | null; // Renamed from answer_text
  answer_type: AnswerType; // Classification of the answer
  reviewed_answer: string | null; // The modified answer if review_status is 'modified'
  review_status: ReviewStatus | null; // Status from the review process
  extraction_timestamp: string; // Renamed from extracted_at (ISO 8601 date string)
  generation_timestamp: string | null; // Renamed from answered_at (ISO 8601 date string or null)
  review_timestamp: string | null; // Renamed from reviewed_at (ISO 8601 date string or null)
  client_name: string | null; // Added to match backend
  order: number; // Sequential order within questionnaire for frontend sorting
}

/**
 * Represents the response from the requirements answer API.
 * Matches the backend QuestionAnswer model.
 */
export interface QuestionAnswer {
  answer: string;
  answer_type: AnswerType;
  context_sufficient: boolean;
  source_requirement_ids: string[];
}

/**
 * Represents the request payload for the requirements answer API.
 */
export interface QuestionRequest {
  question: string;
  product_id: string;
}

/**
 * Represents a requirement generated from a questionnaire question.
 * Matches the backend QuestionGeneratedRequirement model.
 */
export interface QuestionGeneratedRequirement {
  description: string;
  types: string[];
  implementation_status: string;
  implementation_description: string;
  requirement_verification: string;
}
