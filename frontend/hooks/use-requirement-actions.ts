import { useState, useEffect, useCallback } from "react";
import { Requirement } from "@/types/requirement-types";
import { QuestionnaireQuestion } from "@/types/query-types";
import {
  getQuestionRequirementLinks,
  getSimilarRequirementsForQuestion,
} from "@/lib/api/questionnaires";
import {
  listRequirements,
  getRequirement,
  createQuestionLink,
  deleteQuestionLink,
} from "@/lib/api/requirements";
import { loadIgnoredRequirements } from "@/lib/utils/question-ignored-requirements";
import { autoLinkSimilarRequirements } from "@/lib/utils/auto-link-requirements";

interface UseRequirementActionsOptions {
  selectedQuestion: QuestionnaireQuestion | undefined;
  questionnaireId: string | null;
  productId: string | null;
}

export interface UseRequirementActionsReturn {
  requirements: Requirement[];
  existingRequirements: Requirement[];
  isLoadingRequirements: boolean;
  isSearchingSimilar: boolean;
  requirementsError: string | null;
  linkingRequirements: Set<string>;
  isSelectingRequirement: boolean;
  setIsSelectingRequirement: (selecting: boolean) => void;
  handleRequirementSelection: (req: Requirement) => Promise<void>;
  handleDeleteRequirement: (requirement: Requirement) => Promise<void>;
  handleSelectAnotherRequirement: () => Promise<void>;
  handleLinkRequirement: (requirement: Requirement) => Promise<void>;
  loadRequirementsForQuestion: (questionId: string) => Promise<void>;
  handleRefreshSimilarRequirements: () => Promise<void>;
}

/**
 * Gets all requirement IDs to filter out (both linked and ignored).
 * Follows Single Responsibility by handling only ID collection.
 */
const getFilteredRequirementIds = async (
  questionId: string,
): Promise<string[]> => {
  const currentRequirementIds = await getQuestionRequirementLinks(questionId);
  const ignoredRequirementIds = loadIgnoredRequirements(questionId);
  return [...currentRequirementIds, ...ignoredRequirementIds];
};

export function useRequirementActions({
  selectedQuestion,
  questionnaireId,
  productId,
}: UseRequirementActionsOptions): UseRequirementActionsReturn {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [existingRequirements, setExistingRequirements] = useState<
    Requirement[]
  >([]);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState(false);
  const [requirementsError, setRequirementsError] = useState<string | null>(
    null,
  );
  const [linkingRequirements, setLinkingRequirements] = useState<Set<string>>(
    new Set(),
  );
  const [isSelectingRequirement, setIsSelectingRequirement] = useState(false);

  // Helper method to load requirements for a question
  const loadRequirementsForQuestion = useCallback(
    async (questionId: string) => {
      try {
        const requirementIds = await getQuestionRequirementLinks(questionId);

        if (requirementIds.length === 0) {
          setRequirements([]);
          return;
        }

        const requirementPromises = requirementIds.map((id) =>
          getRequirement(id),
        );
        const loadedRequirements = await Promise.all(requirementPromises);
        setRequirements(loadedRequirements);
      } catch (error) {
        console.error("Failed to load requirements:", error);
        setRequirementsError(
          error instanceof Error
            ? error.message
            : "Failed to load requirements",
        );
        setRequirements([]);
      }
    },
    [],
  );

  // Load requirements when selected question ID changes
  useEffect(() => {
    const loadRequirements = async () => {
      if (!selectedQuestion?.id) {
        setRequirements([]);
        return;
      }

      setIsLoadingRequirements(true);
      setRequirementsError(null);

      await loadRequirementsForQuestion(selectedQuestion.id);
      setIsLoadingRequirements(false);
    };

    loadRequirements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuestion?.id]); // Only re-run when question ID changes, not when object reference changes

  const handleRequirementSelection = useCallback(
    async (req: Requirement) => {
      if (!selectedQuestion?.id || !req.id) {
        setRequirementsError("Missing question ID or requirement ID");
        return;
      }

      try {
        await createQuestionLink(req.id.toString(), selectedQuestion.id);
        await loadRequirementsForQuestion(selectedQuestion.id);

        setIsSelectingRequirement(false);
      } catch (error) {
        console.error("Error creating question link:", error);
        setRequirementsError(
          error instanceof Error
            ? error.message
            : "Failed to link requirement to question",
        );
      }
    },
    [selectedQuestion, loadRequirementsForQuestion],
  );

  const handleDeleteRequirement = useCallback(
    async (requirement: Requirement) => {
      if (!selectedQuestion?.id) return;

      try {
        await deleteQuestionLink(
          requirement.id.toString(),
          selectedQuestion.id,
        );

        // Remove from linked requirements list
        await loadRequirementsForQuestion(selectedQuestion.id);
      } catch (error) {
        console.error("Error deleting question link:", error);
        setRequirementsError(
          error instanceof Error
            ? error.message
            : "Failed to unlink requirement from question",
        );
      }
    },
    [selectedQuestion, loadRequirementsForQuestion],
  );

  const handleSelectAnotherRequirement = useCallback(async () => {
    setIsLoadingRequirements(true);
    try {
      if (!questionnaireId) {
        throw new Error("Questionnaire ID is not available");
      }

      if (!productId) {
        throw new Error("Product ID not found for this questionnaire");
      }

      if (!selectedQuestion?.id) {
        throw new Error("No question selected");
      }

      const [allRequirements, linkedRequirementIds] = await Promise.all([
        listRequirements(productId),
        getQuestionRequirementLinks(selectedQuestion.id),
      ]);

      // Filter out already-linked requirements
      const availableRequirements = allRequirements.filter(
        (req) => !linkedRequirementIds.includes(req.id.toString()),
      );

      setExistingRequirements(availableRequirements);
      setIsSelectingRequirement(true);
    } catch (error) {
      console.error("Failed to fetch existing requirements:", error);
      setExistingRequirements([]);
      setRequirementsError(
        error instanceof Error
          ? error.message
          : "Failed to load available requirements",
      );
    } finally {
      setIsLoadingRequirements(false);
    }
  }, [questionnaireId, productId, selectedQuestion]);

  const handleLinkRequirement = useCallback(
    async (requirement: Requirement) => {
      if (!selectedQuestion?.id) return;

      const requirementId = requirement.id;
      const questionId = selectedQuestion.id;

      setLinkingRequirements((prev) => new Set(prev).add(requirementId));

      try {
        await createQuestionLink(requirementId, questionId);
        await loadRequirementsForQuestion(questionId);
      } catch (error) {
        console.error("Error linking requirement:", error);
        setRequirementsError(
          error instanceof Error
            ? error.message
            : "Failed to link requirement to question",
        );
      } finally {
        setLinkingRequirements((prev) => {
          const newSet = new Set(prev);
          newSet.delete(requirementId);
          return newSet;
        });
      }
    },
    [selectedQuestion, loadRequirementsForQuestion],
  );

  const handleRefreshSimilarRequirements = useCallback(async () => {
    if (!selectedQuestion?.id) return;

    setIsSearchingSimilar(true);
    setRequirementsError(null);

    try {
      // Get all requirement IDs to exclude from search
      const filterRequirementIds = await getFilteredRequirementIds(
        selectedQuestion.id,
      );

      // Find similar requirements (excluding already linked and ignored ones)
      const similarRequirements = await getSimilarRequirementsForQuestion(
        selectedQuestion.id,
        5, // Get top 5 similar requirements
        filterRequirementIds,
      );

      // Auto-link requirements with high similarity using shared utility
      await autoLinkSimilarRequirements(similarRequirements, (requirementId) =>
        createQuestionLink(requirementId, selectedQuestion.id),
      );

      // Reload the updated list of requirements
      await loadRequirementsForQuestion(selectedQuestion.id);
    } catch (error) {
      console.error("Failed to refresh similar requirements:", error);
      setRequirementsError(
        error instanceof Error
          ? error.message
          : "Failed to refresh similar requirements",
      );
    } finally {
      setIsSearchingSimilar(false);
    }
  }, [selectedQuestion, loadRequirementsForQuestion]);

  return {
    requirements,
    existingRequirements,
    isLoadingRequirements,
    isSearchingSimilar,
    requirementsError,
    linkingRequirements,
    isSelectingRequirement,
    setIsSelectingRequirement,
    handleRequirementSelection,
    handleDeleteRequirement,
    handleSelectAnotherRequirement,
    handleLinkRequirement,
    loadRequirementsForQuestion,
    handleRefreshSimilarRequirements,
  };
}
