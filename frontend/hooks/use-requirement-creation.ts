import { useState } from "react";
import {
  generateRequirementFromQuestion,
  getQuestionRequirementLinks,
} from "@/lib/api/questionnaires";
import { createQuestionLink } from "@/lib/api/requirements";
import { toast } from "sonner";
import type { QuestionGeneratedRequirement } from "@/types/query-types";

interface UseRequirementCreationOptions {
  questionId: string | null;
  onRequirementsUpdate: () => Promise<void>;
}

const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 10;

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useRequirementCreation({
  questionId,
  onRequirementsUpdate,
}: UseRequirementCreationOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [generatedData, setGeneratedData] =
    useState<QuestionGeneratedRequirement | null>(null);

  const generateRequirement = async () => {
    if (!questionId) {
      toast.error("No question selected");
      return null;
    }

    setIsGenerating(true);
    setGeneratedData(null);

    try {
      const data = await generateRequirementFromQuestion(questionId);
      setGeneratedData(data);
      toast.success("Requirement generated successfully!");
      return data;
    } catch (error) {
      const errorMessage = formatErrorMessage(error);
      console.error("Failed to generate requirement:", errorMessage);
      toast.error(`Failed to generate requirement: ${errorMessage}`);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const pollForNewRequirement = async (
    questionId: string,
    initialCount: number,
  ): Promise<boolean> => {
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      try {
        const requirementIds = await getQuestionRequirementLinks(questionId);
        consecutiveErrors = 0;

        if (requirementIds.length > initialCount) {
          await onRequirementsUpdate();
          return true;
        }
      } catch (error) {
        consecutiveErrors++;
        console.error("Error checking requirements during polling:", error);

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          toast.error(
            "Unable to verify requirement link - please refresh the page",
          );
          return false;
        }
      }
    }

    return false;
  };

  const linkAndRefresh = async (requirementId: string) => {
    if (!questionId) {
      toast.error("No question selected");
      return;
    }

    setIsLinking(true);

    try {
      // Get initial requirement count
      const initialRequirementIds =
        await getQuestionRequirementLinks(questionId);
      const initialCount = initialRequirementIds.length;

      // Create the link
      await createQuestionLink(requirementId, questionId);

      // Poll until requirement appears
      const requirementAppeared = await pollForNewRequirement(
        questionId,
        initialCount,
      );

      if (requirementAppeared) {
        toast.success("Requirement created and linked successfully!");
      } else {
        toast.warning("Requirement created but may take a moment to appear");
      }
    } catch (error) {
      const errorMessage = formatErrorMessage(error);
      console.error("Failed to link requirement:", errorMessage);
      toast.error(`Failed to link requirement: ${errorMessage}`);
    } finally {
      setIsLinking(false);
    }
  };

  const reset = () => {
    setGeneratedData(null);
    setIsGenerating(false);
    setIsLinking(false);
  };

  return {
    isGenerating,
    isLinking,
    generatedData,
    generateRequirement,
    linkAndRefresh,
    reset,
  };
}
