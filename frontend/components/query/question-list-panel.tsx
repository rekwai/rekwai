"use client";

import { useState } from "react";
import { QuestionListPanelProps } from "@/types/question-modal";
import { isAnswered } from "@/lib/utils/question-modal";
import { formatDate } from "@/lib/utils/date-utils";
import { ItemListPanel } from "@/components/common/item-list-panel";
import {
  MetadataRow,
  MetadataSection,
  TimestampRow,
} from "@/components/common/metadata-display";
import { AddQuestionDialog } from "./add-question-dialog";
import {
  addQuestionnaireQuestion,
  deleteQuestionnaireQuestion,
} from "@/lib/api/questionnaires";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { QuestionnaireQuestion } from "@/types/query-types";

export function QuestionListPanel({
  questions,
  selectedIndex,
  selectedTab,
  isLoadingQuestions = false,
  questionsError,
  questionnaireId,
  questionnaireKey,
  clientName,
  requirements,
  onIndexChange,
  onTabChange,
  onQuestionsUpdate,
}: QuestionListPanelProps & {
  onQuestionsUpdate?: (questions: QuestionnaireQuestion[]) => void;
}) {
  const selectedQuestion = questions[selectedIndex];
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] =
    useState<QuestionnaireQuestion | null>(null);
  const { toast } = useToast();

  const handleAddQuestion = async (questionText: string) => {
    if (!questionnaireId) return;

    try {
      const newQuestion = await addQuestionnaireQuestion(
        questionnaireId,
        questionText,
      );
      if (onQuestionsUpdate) {
        onQuestionsUpdate([...questions, newQuestion]);
        // Select the new question (it should be the last one)
        onIndexChange(questions.length);
      }
      toast({
        title: "Question added",
        description: "The question has been added successfully.",
      });
    } catch (error) {
      console.error("Failed to add question:", error);
      toast({
        title: "Error",
        description: "Failed to add question. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;

    try {
      await deleteQuestionnaireQuestion(questionToDelete.id);

      const newQuestions = questions.filter(
        (q) => q.id !== questionToDelete.id,
      );
      if (onQuestionsUpdate) {
        onQuestionsUpdate(newQuestions);
        // Adjust selected index if needed
        if (selectedIndex >= newQuestions.length && newQuestions.length > 0) {
          onIndexChange(newQuestions.length - 1);
        } else if (newQuestions.length === 0) {
          // Handle empty state if needed, index can stay 0 or -1
          onIndexChange(0);
        }
      }

      toast({
        title: "Question deleted",
        description: "The question has been deleted successfully.",
      });
    } catch (error) {
      console.error("Failed to delete question:", error);
      toast({
        title: "Error",
        description: "Failed to delete question.",
        variant: "destructive",
      });
    } finally {
      setQuestionToDelete(null);
    }
  };

  return (
    <>
      <ItemListPanel
        activeTab={selectedTab}
        onTabChange={(tab) => onTabChange(tab as "questions" | "metadata")}
        tabs={[
          { value: "questions", label: "Questions" },
          { value: "metadata", label: "Metadata" },
        ]}
        items={questions}
        selectedIndex={selectedIndex}
        onItemSelect={onIndexChange}
        isLoading={isLoadingQuestions}
        error={questionsError}
        emptyMessage="No questions found"
        loadingMessage="Loading questions..."
        getItemId={(q) => q.id}
        getItemText={(q) => q.question_text}
        isItemCompleted={(q) => !!isAnswered(q)}
        getItemAnswerType={(q) => q.answer_type}
        isItemError={(q) => !isAnswered(q)}
        itemTestIdPrefix="question-item"
        onAdd={() => setIsAddDialogOpen(true)}
        onDelete={(q) => setQuestionToDelete(q)}
        renderMetadata={() => (
          <div className="p-4 space-y-6">
            <MetadataSection title="Questionnaire Information">
              <MetadataRow
                label="ID:"
                value={questionnaireId || "N/A"}
                testId="questionnaire-name"
              />
              <MetadataRow
                label="Client:"
                value={clientName || "N/A"}
                testId="client-name"
              />
              <MetadataRow
                label="Total Questions:"
                value={questions.length}
                testId="total-questions"
              />
            </MetadataSection>

            <MetadataSection title="Questionnaire Key">
              <MetadataRow label="Key:" value={questionnaireKey || "N/A"} />
            </MetadataSection>

            {selectedQuestion && (
              <MetadataSection title="Question Information">
                <MetadataRow
                  label="Status:"
                  value={selectedQuestion.status}
                  className="capitalize"
                />
                <MetadataRow
                  label="Requirements:"
                  value={requirements.length}
                />
              </MetadataSection>
            )}

            <MetadataSection title="Timestamps">
              <TimestampRow
                label="Extracted on"
                date={selectedQuestion?.extraction_timestamp}
                formatDate={formatDate}
              />
              {selectedQuestion?.generation_timestamp && (
                <TimestampRow
                  label="Generated on"
                  date={selectedQuestion.generation_timestamp}
                  formatDate={formatDate}
                />
              )}
            </MetadataSection>
          </div>
        )}
      />

      <AddQuestionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAdd={handleAddQuestion}
      />

      <AlertDialog
        open={!!questionToDelete}
        onOpenChange={(open) => !open && setQuestionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              question and any links to requirements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuestion}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
