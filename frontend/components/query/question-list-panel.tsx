"use client";

import { QuestionListPanelProps } from "@/types/question-modal";
import { isAnswered } from "@/lib/utils/question-modal";
import { formatDate } from "@/lib/utils/date-utils";
import { ItemListPanel } from "@/components/common/item-list-panel";
import {
  MetadataRow,
  MetadataSection,
  TimestampRow,
} from "@/components/common/metadata-display";

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
}: QuestionListPanelProps) {
  const selectedQuestion = questions[selectedIndex];

  return (
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
              <MetadataRow label="Requirements:" value={requirements.length} />
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
  );
}
