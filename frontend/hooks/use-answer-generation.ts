import { useState, useEffect, useCallback } from "react";
import { QuestionnaireQuestion, AnswerType } from "@/types/query-types";
import { saveQuestionAnswer } from "@/lib/api/questionnaires";
import { answerQuestion } from "@/lib/api/requirements";

interface UseAnswerGenerationOptions {
  selectedQuestion: QuestionnaireQuestion | undefined;
  questionnaireId: string | null;
  productId: string | null;
  questions: QuestionnaireQuestion[];
  selectedIndex: number;
  setQuestions: (questions: QuestionnaireQuestion[]) => void;
}

interface UseAnswerGenerationReturn {
  isEditingResult: boolean;
  editedResult: string;
  isGeneratingAnswer: boolean;
  generateAnswerError: string | null;
  saveAnswerError: string | null;
  setIsEditingResult: (editing: boolean) => void;
  setEditedResult: (result: string) => void;
  handleGenerateAnswer: () => Promise<void>;
  handleSaveEditedAnswer: () => Promise<void>;
  handleCancelEdit: () => void;
}

export function useAnswerGeneration({
  selectedQuestion,
  questionnaireId,
  productId,
  questions,
  selectedIndex,
  setQuestions,
}: UseAnswerGenerationOptions): UseAnswerGenerationReturn {
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [editedResult, setEditedResult] = useState("");
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [generateAnswerError, setGenerateAnswerError] = useState<string | null>(
    null,
  );
  const [saveAnswerError, setSaveAnswerError] = useState<string | null>(null);

  // Reset generate answer error when switching questions
  useEffect(() => {
    setGenerateAnswerError(null);
  }, [selectedQuestion?.id]);

  const handleGenerateAnswer = useCallback(async () => {
    if (!selectedQuestion?.id || !questionnaireId || !productId) {
      return;
    }

    setIsGeneratingAnswer(true);
    setGenerateAnswerError(null);

    try {
      const response = await answerQuestion({
        question: selectedQuestion.question_text,
        product_id: productId,
      });

      if (response.context_sufficient) {
        // Save the answer and update the UI
        await saveQuestionAnswer(
          selectedQuestion.id,
          response.answer,
          response.answer_type,
        );

        // Update the questions state to reflect the new answer
        const updatedQuestions = [...questions];
        updatedQuestions[selectedIndex] = {
          ...updatedQuestions[selectedIndex],
          generated_answer: response.answer,
          answer_type: response.answer_type,
        };
        setQuestions(updatedQuestions);
      } else {
        // Show insufficient context persistently with tooltip containing the partial answer
        setGenerateAnswerError(response.answer || "Insufficient context");
        // Do not auto-clear; it will be cleared on next generation attempt or when modal closes
      }
    } catch (error) {
      console.error("Error generating answer:", error);
      setGenerateAnswerError("Failed to generate answer");

      // Clear error after 3 seconds
      setTimeout(() => {
        setGenerateAnswerError(null);
      }, 3000);
    } finally {
      setIsGeneratingAnswer(false);
    }
  }, [
    selectedQuestion,
    questionnaireId,
    productId,
    questions,
    selectedIndex,
    setQuestions,
  ]);

  const handleSaveEditedAnswer = useCallback(async () => {
    if (!selectedQuestion?.id) return;

    setSaveAnswerError(null);

    try {
      // Save the edited result to the backend, preserving existing answer_type
      await saveQuestionAnswer(
        selectedQuestion.id,
        editedResult,
        selectedQuestion.answer_type,
      );

      // Update local state after successful save
      const updatedQuestions = [...questions];
      updatedQuestions[selectedIndex] = {
        ...updatedQuestions[selectedIndex],
        generated_answer: editedResult,
      };
      setQuestions(updatedQuestions);
      setIsEditingResult(false);
    } catch (error) {
      console.error("Error saving answer:", error);
      setSaveAnswerError("Failed to save answer");

      // Clear error after 3 seconds
      setTimeout(() => {
        setSaveAnswerError(null);
      }, 3000);
    }
  }, [selectedQuestion, editedResult, questions, selectedIndex, setQuestions]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingResult(false);
    setEditedResult(selectedQuestion?.generated_answer || "");
  }, [selectedQuestion]);

  return {
    isEditingResult,
    editedResult,
    isGeneratingAnswer,
    generateAnswerError,
    saveAnswerError,
    setIsEditingResult,
    setEditedResult,
    handleGenerateAnswer,
    handleSaveEditedAnswer,
    handleCancelEdit,
  };
}
