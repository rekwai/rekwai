import { QuestionnaireQuestion } from "@/types/query-types";

// Utility functions for question modal
export const isAnswered = (q: QuestionnaireQuestion) =>
  q.generated_answer && q.generated_answer.length > 0;

// Re-export shared styles from centralized styles module
export {
  buttonStyles,
  badgeStyles,
  getRequirementBadgeClassName,
  inputStyles,
  shadowStyles,
  getStatusBadgeStyles,
} from "./styles";
