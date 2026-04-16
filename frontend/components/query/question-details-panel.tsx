"use client";

import { useState } from "react";
import { QuestionDetailsPanelProps } from "@/types/question-modal";
import { AnswerGenerationSection } from "./answer-generation-section";
import { QueryRequirementsSection } from "./query-requirement-section";
import { CreateRequirementModal } from "@/components/requirement/create-requirement-modal";
import { useAnswerGeneration } from "@/hooks/use-answer-generation";
import { useRequirementCreation } from "@/hooks/use-requirement-creation";

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

  const handleCreateNewRequirement = async () => {
    if (!selectedQuestion) return;

    // Open modal immediately
    setCreateRequirementModalOpen(true);

    // Start AI generation in background
    await requirementCreation.generateRequirement();
  };

  if (!selectedQuestion) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-muted-foreground italic">
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
      <div className="p-8 space-y-6 bg-semantic-bg-elevation-2 min-h-full" data-testid="question-details">
        {requirementActions.isLoadingRequirements ? (
          // Unified loading state for both Result and Requirements
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
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
