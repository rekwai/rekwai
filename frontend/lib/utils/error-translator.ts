/**
 * Error translation utility for converting technical error messages
 * into user-friendly messages with actionable suggestions.
 */

// Error categories for classification
export type ErrorCategory =
  | "llm_output" // LLM failed to produce valid structured output
  | "llm_connection" // Rate limits, timeouts, network issues
  | "file_processing" // Document extraction failures
  | "validation" // Pydantic/format validation errors
  | "storage" // S3/file storage issues
  | "unknown"; // Fallback

export interface TranslatedError {
  friendlyMessage: string; // User-facing message
  technicalDetails: string; // Original error (for "Show details")
  suggestions: string[]; // Actionable tips
  category: ErrorCategory; // For potential styling/icons
}

// Error pattern matchers - order matters (more specific first)
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  category: ErrorCategory;
  friendlyMessage: string;
  suggestions: string[];
}> = [
  // LLM output validation failures (max retries exhausted)
  {
    pattern: /Exceeded maximum retries.*output validation/i,
    category: "llm_output",
    friendlyMessage: "The AI model had difficulty processing your document.",
    suggestions: [
      "Try uploading again - AI responses can vary",
      "Try using a different model in settings",
      "If the document is complex, try splitting it into smaller sections",
    ],
  },
  // Malformed tool call (model doesn't support function calling well)
  // Matches: "function.arguments ... Input should be a valid string" (Pydantic validation)
  // or "malformed ... tool call" (general tool call failures)
  {
    pattern:
      /function\.arguments.*Input should be a valid string|malformed.*tool call/i,
    category: "llm_output",
    friendlyMessage: "The AI model returned an unexpected response format.",
    suggestions: [
      "Try using a different model - some models have better structured output support",
      "Try uploading again",
    ],
  },
  // Empty AI response
  {
    pattern: /Content field missing/i,
    category: "llm_connection",
    friendlyMessage: "The AI service returned an empty response.",
    suggestions: [
      "Try uploading again in a few moments",
      "The AI service may be experiencing temporary issues",
    ],
  },
  // Rate limiting
  {
    pattern: /429|rate limit/i,
    category: "llm_connection",
    friendlyMessage: "The AI service is temporarily overloaded.",
    suggestions: [
      "Wait a minute and try again",
      "If this persists, the service may be experiencing high demand",
    ],
  },
  // Service unavailable
  {
    pattern: /503|service unavailable/i,
    category: "llm_connection",
    friendlyMessage: "The AI service is temporarily unavailable.",
    suggestions: [
      "Wait a few minutes and try again",
      "Check if the AI service is operational",
    ],
  },
  // JSON parsing errors (often from LLM output)
  {
    pattern: /Expecting value.*line.*column|JSONDecodeError|json\.loads/i,
    category: "llm_output",
    friendlyMessage:
      "The AI model produced an invalid response that could not be parsed.",
    suggestions: [
      "Try uploading again - AI responses can vary",
      "Try using a different model in settings",
    ],
  },
  // Pydantic validation errors
  {
    pattern: /validation error|ValidationError|field required/i,
    category: "validation",
    friendlyMessage:
      "The document could not be processed due to a data format issue.",
    suggestions: [
      "Ensure your document is not corrupted",
      "Try a different file format if available",
    ],
  },
  // S3/Storage errors
  {
    pattern: /Failed to read file from S3|S3|storage|bucket/i,
    category: "storage",
    friendlyMessage: "There was a problem accessing the uploaded file.",
    suggestions: [
      "Try uploading the file again",
      "Ensure your file is not too large",
    ],
  },
  // Docling/extraction failures
  {
    pattern: /Failed to extract|extraction failed|docling/i,
    category: "file_processing",
    friendlyMessage: "The document could not be properly read.",
    suggestions: [
      "Ensure the document is not password-protected",
      "Try converting to a different format (PDF, DOCX)",
      "Check that the file is not corrupted",
    ],
  },
  // Agent execution failures
  {
    pattern: /agent failed to execute|RuntimeError.*agent/i,
    category: "llm_output",
    friendlyMessage: "An AI processing step failed unexpectedly.",
    suggestions: [
      "Try uploading again",
      "Try using a different model in settings",
    ],
  },
  // Network/connection errors
  {
    pattern: /network|connection|timeout|ECONNREFUSED|ETIMEDOUT/i,
    category: "llm_connection",
    friendlyMessage: "A network connection error occurred.",
    suggestions: [
      "Check your internet connection",
      "Try again in a few moments",
    ],
  },
];

// Default fallback for unknown errors
const DEFAULT_ERROR: Omit<TranslatedError, "technicalDetails"> = {
  friendlyMessage:
    "An unexpected error occurred while processing your document.",
  suggestions: [
    "Try uploading again",
    "If the problem persists, contact support",
  ],
  category: "unknown",
};

/**
 * Creates a simple validation error (for form validation messages).
 * Use this for inline validation errors that don't need pattern matching.
 */
export function createValidationError(message: string): TranslatedError {
  return {
    friendlyMessage: message,
    technicalDetails: message,
    suggestions: [],
    category: "validation",
  };
}

/**
 * Translates a raw technical error message into a user-friendly format.
 */
export function translateUploadError(rawError: string): TranslatedError {
  // Find matching pattern
  for (const {
    pattern,
    category,
    friendlyMessage,
    suggestions,
  } of ERROR_PATTERNS) {
    if (pattern.test(rawError)) {
      return {
        friendlyMessage,
        technicalDetails: rawError,
        suggestions,
        category,
      };
    }
  }

  // Fallback for unrecognized errors
  return {
    ...DEFAULT_ERROR,
    technicalDetails: rawError,
  };
}
