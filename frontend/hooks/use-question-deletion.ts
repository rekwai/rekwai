import { useState } from "react";
import { QuestionnaireQuestion } from "@/types/query-types";
import { deleteQuestionnaireQuestion } from "@/lib/api/questionnaires";
import { toast } from "sonner";

interface UseQuestionDeletionOptions {
  questions: QuestionnaireQuestion[];
  selectedIndex: number;
  onQuestionsUpdate: (questions: QuestionnaireQuestion[]) => void;
  onQuestionChange: (index: number) => void;
}

export function useQuestionDeletion({
  questions,
  selectedIndex,
  onQuestionsUpdate,
  onQuestionChange,
}: UseQuestionDeletionOptions) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteQuestion = async (questionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this question? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteQuestionnaireQuestion(questionId);
      toast.success("Question deleted successfully");

      // Remove question from local state
      const updatedQuestions = questions.filter((q) => q.id !== questionId);
      onQuestionsUpdate(updatedQuestions);

      // Navigate to previous question or stay at same index if deleting first
      if (selectedIndex > 0) {
        onQuestionChange(selectedIndex - 1);
      } else if (updatedQuestions.length > 0) {
        onQuestionChange(0);
      }
    } catch (error) {
      console.error("Failed to delete question:", error);
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to delete question: ${message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    handleDeleteQuestion,
    isDeleting,
  };
}
