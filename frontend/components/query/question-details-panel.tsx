"use client";

import { useState, useEffect } from "react";
import { QuestionDetailsPanelProps } from "@/types/question-modal";
import { AnswerGenerationSection } from "./answer-generation-section";
import { QueryRequirementsSection } from "./query-requirement-section";
import { CreateRequirementModal } from "@/components/requirement/create-requirement-modal";
import { useAnswerGeneration } from "@/hooks/use-answer-generation";
import { useRequirementCreation } from "@/hooks/use-requirement-creation";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateQuestionnaireQuestion } from "@/lib/api/questionnaires";
import { useToast } from "@/components/ui/use-toast";

export function QuestionDetailsPanel({
  selectedQuestion,
  questions,
  selectedIndex,
  productId,
  questionnaireId,
  onQuestionsUpdate,
  requirementActions,
}: QuestionDetailsPanelProps) {
  const [createRequirementModalOpen, setCreateRequirementModalOpen] =
    useState(false);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editedQuestionText, setEditedQuestionText] = useState("");
  const { toast } = useToast();

  const answerGeneration = useAnswerGeneration({
    selectedQuestion,
    questionnaireId,
    productId,
    questions,
    selectedIndex,
    setQuestions: onQuestionsUpdate,
  });

  const requirementCreation = useRequirementCreation({
    questionId: selectedQuestion?.id || null,
    onRequirementsUpdate: async () => {
      if (selectedQuestion?.id) {
        await requirementActions.loadRequirementsForQuestion(
          selectedQuestion.id,
        );
      }
    },
  });

  useEffect(() => {
    if (selectedQuestion) {
      setEditedQuestionText(selectedQuestion.question_text);
      setIsEditingQuestion(false);
    }
  }, [selectedQuestion]);

  const handleCreateNewRequirement = async () => {
    if (!selectedQuestion) return;

    // Open modal immediately
    setCreateRequirementModalOpen(true);

    // Start AI generation in background
    await requirementCreation.generateRequirement();
  };

  const handleSaveQuestionText = async () => {
    if (
      !selectedQuestion ||
      !editedQuestionText.trim() ||
      editedQuestionText === selectedQuestion.question_text
    ) {
      setIsEditingQuestion(false);
      return;
    }

    try {
      const updatedQuestion = await updateQuestionnaireQuestion(
        selectedQuestion.id,
        {
          question_text: editedQuestionText,
        },
      );

      const newQuestions = [...questions];
      newQuestions[selectedIndex] = updatedQuestion;
      onQuestionsUpdate(newQuestions);

      setIsEditingQuestion(false);
      toast({
        title: "Question updated",
        description: "Question text updated successfully.",
      });
    } catch (error) {
      console.error("Failed to update question:", error);
      toast({
        title: "Error",
        description: "Failed to update question text.",
        variant: "destructive",
      });
    }
  };

  if (!selectedQuestion) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-gray-500 dark:text-[#FAFFFD] italic">
        Select a question to view details.
      </div>
    );
  }

  const hasNoRequirements =
    !requirementActions.isLoadingRequirements &&
    requirementActions.requirements.length === 0 &&
    !requirementActions.requirementsError;

  return (
    <>
      <div className="p-8 space-y-6" data-testid="question-details">
        {/* Question Text Header */}
        <div className="flex items-start justify-between gap-4">
          {isEditingQuestion ? (
            <div className="flex-1 space-y-2">
              <Textarea
                value={editedQuestionText}
                onChange={(e) => setEditedQuestionText(e.target.value)}
                className="text-base min-h-[80px]"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveQuestionText}>
                  <Check className="w-4 h-4 mr-1" /> Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditedQuestionText(selectedQuestion.question_text);
                    setIsEditingQuestion(false);
                  }}
                >
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="flex-1 text-base text-[#080705] dark:text-[#FAFFFD]"
              data-testid="question-text"
            >
              {selectedQuestion.question_text}
            </div>
          )}

          {!isEditingQuestion && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingQuestion(true)}
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex-shrink-0"
              title="Edit Question Text"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </div>

        {requirementActions.isLoadingRequirements ? (
          // Unified loading state for both Result and Requirements
          <div className="flex flex-col items-center justify-center p-12 text-gray-500 dark:text-gray-400">
            <div className="font-inter font-normal text-sm">
              Searching the system for answers...
            </div>
          </div>
        ) : (
          <>
            {/* Answer Generation Section */}
            <AnswerGenerationSection
              selectedQuestion={selectedQuestion}
              isEditingResult={answerGeneration.isEditingResult}
              editedResult={answerGeneration.editedResult}
              isGeneratingAnswer={answerGeneration.isGeneratingAnswer}
              generateAnswerError={answerGeneration.generateAnswerError}
              saveAnswerError={answerGeneration.saveAnswerError}
              hasNoRequirements={hasNoRequirements}
              onEditingChange={answerGeneration.setIsEditingResult}
              onResultChange={answerGeneration.setEditedResult}
              onGenerateAnswer={answerGeneration.handleGenerateAnswer}
              onSaveAnswer={answerGeneration.handleSaveEditedAnswer}
              onCancelEdit={answerGeneration.handleCancelEdit}
            />

            {/* Requirements Section */}
            <QueryRequirementsSection
              linkedRequirements={requirementActions.requirements}
              isLoadingRequirements={requirementActions.isLoadingRequirements}
              isLinkingRequirement={requirementCreation.isLinking}
              isSearchingSimilar={requirementActions.isSearchingSimilar}
              requirementsError={requirementActions.requirementsError}
              onUnlinkRequirement={requirementActions.handleDeleteRequirement}
              onLinkRequirement={requirementActions.handleLinkRequirement}
              onCreateRequirement={handleCreateNewRequirement}
              onRefreshSimilarRequirements={
                requirementActions.handleRefreshSimilarRequirements
              }
              productId={productId!}
              questionId={selectedQuestion.id}
            />
          </>
        )}
      </div>

      {/* Create Requirement Modal */}
      <CreateRequirementModal
        open={createRequirementModalOpen}
        onOpenChange={(open) => {
          setCreateRequirementModalOpen(open);
          if (!open) {
            requirementCreation.reset();
          }
        }}
        productId={productId}
        isGeneratingData={requirementCreation.isGenerating}
        initialValues={
          requirementCreation.generatedData
            ? {
                description: requirementCreation.generatedData.description,
                types: requirementCreation.generatedData.types,
                implementation_status:
                  requirementCreation.generatedData.implementation_status,
                implementation_description:
                  requirementCreation.generatedData.implementation_description,
                requirement_verification:
                  requirementCreation.generatedData.requirement_verification,
              }
            : undefined
        }
        onComplete={async (createdRequirement) => {
          if (createdRequirement?.id) {
            await requirementCreation.linkAndRefresh(
              createdRequirement.id.toString(),
            );
          }
        }}
      />
    </>
  );
}
