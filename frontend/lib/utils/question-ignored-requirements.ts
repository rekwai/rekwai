/**
 * Utility functions for managing ignored requirements for questionnaire questions.
 * Uses the shared createIgnoredRequirementsStorage factory for localStorage operations.
 */

import { createIgnoredRequirementsStorage } from "./requirement-indexing-utils";

const storage = createIgnoredRequirementsStorage(
  "question_ignored_requirements",
);

export const loadIgnoredRequirements = (questionId: string): string[] => {
  return storage.loadIgnoredRequirements(questionId);
};

export const addIgnoredRequirement = (
  questionId: string,
  requirementId: string,
): void => {
  const current = loadIgnoredRequirements(questionId);
  if (!current.includes(requirementId)) {
    storage.saveIgnoredRequirements(questionId, [...current, requirementId]);
  }
};
