"use client";

import { Pencil, RotateCcw } from "lucide-react";
import { Info } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnswerGenerationSectionProps } from "@/types/question-modal";
import {
  badgeStyles,
  buttonStyles,
  inputStyles,
  shadowStyles,
} from "@/lib/utils/question-modal";

function getAnswerTypeDisplay(answerType: string | null | undefined) {
  if (!answerType || answerType === "n/a") return null;

  switch (answerType) {
    case "yes":
      return { label: "Yes", colorClass: "text-semantic-success-fg" };
    case "no":
      return { label: "No", colorClass: "text-semantic-error-fg" };
    default:
      return null;
  }
}

export function AnswerGenerationSection({
  selectedQuestion,
  isEditingResult,
  editedResult,
  isGeneratingAnswer,
  generateAnswerError,
  saveAnswerError,
  hasNoRequirements = false,
  onEditingChange,
  onResultChange,
  onGenerateAnswer,
  onSaveAnswer,
  onCancelEdit,
}: AnswerGenerationSectionProps) {
  // Determine answer display content
  const renderAnswerContent = () => {
    if (isGeneratingAnswer) {
      return (
        <div className="space-y-3" data-testid="answer-skeleton">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[80%]" />
        </div>
      );
    }

    if (selectedQuestion.generated_answer) {
      const typeDisplay = getAnswerTypeDisplay(selectedQuestion.answer_type);
      return (
        <div>
          {typeDisplay && (
            <>
              <span
                className={`font-semibold ${typeDisplay.colorClass}`}
                data-testid="answer-type-label"
              >
                {typeDisplay.label}
              </span>
              <span className="mx-1">—</span>
            </>
          )}
          <span>{selectedQuestion.generated_answer}</span>
        </div>
      );
    }

    if (hasNoRequirements) {
      return (
        <div 
          className="flex flex-row items-center py-3 px-3 gap-2 bg-primitive-orange-100 rounded-[4px] border border-primitive-orange-200 w-full"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-row items-center p-0 gap-2" aria-hidden="true">
            <Info size={16} className="text-semantic-indicator-3" weight="fill" />
          </div>
          <span className="font-inter font-normal text-sm leading-[130%] text-semantic-text">
            Unable to generate an answer as no requirements were found relating
            to this question.
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="italic text-muted-foreground">
          No answer generated yet.
        </span>
      </div>
    );
  };

  return (
    <div
      className="flex flex-col items-start p-0 gap-2 w-full max-w-[672px]"
      data-testid="answer-section"
    >
      <div className="flex flex-row items-center p-0 gap-2.5">
        <Badge className="flex flex-row justify-center items-center px-3 py-1.5 gap-1.5 bg-secondary text-secondary-foreground rounded-[3px] font-inter font-medium text-sm leading-4 tracking-[0.04px] hover:bg-secondary border border-border">
          Answer
        </Badge>

        {/* Result toolbar (Figma 1015:26110): nested controls on elevation-2 track */}
        {!isEditingResult && (
          <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateAnswer}
              disabled={isGeneratingAnswer}
              className="h-7 px-2.5 py-1 rounded-[4px] border border-border bg-background text-foreground shadow-none hover:bg-accent disabled:opacity-50"
              data-testid="regenerate-answer-button-top"
            >
              <RotateCcw
                size={12}
                className={
                  isGeneratingAnswer
                    ? "animate-[spin_1s_linear_infinite_reverse] text-foreground"
                    : "text-foreground"
                }
              />
            </Button>
            {!isGeneratingAnswer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onResultChange(selectedQuestion.generated_answer || "");
                  onEditingChange(true);
                }}
                className="h-7 px-2.5 py-1 rounded-[4px] border border-border bg-background text-foreground shadow-none hover:bg-accent"
                data-testid="edit-answer-button-top"
              >
                <Pencil size={12} className="text-foreground" />
              </Button>
            )}
          </div>
        )}
      </div>
      {isEditingResult ? (
        <div className="w-full space-y-3">
          <div className="relative w-full">
            <textarea
              value={editedResult}
              onChange={(e) => onResultChange(e.target.value)}
              placeholder="Enter result text..."
              className={inputStyles.textarea}
              style={{
                boxShadow: shadowStyles.inset,
              }}
              data-testid="answer-editor"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelEdit}
              className={buttonStyles.ghost}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSaveAnswer}
              className={buttonStyles.primary}
              data-testid="save-answer-button"
            >
              Save
            </Button>
          </div>

          {/* Save error message */}
          {saveAnswerError && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
              <Info size={14} />
              <span>{saveAnswerError}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full">
          <div
            className="font-inter font-normal text-sm leading-[150%] text-semantic-text w-full"
            data-testid="answer-result"
          >
            {renderAnswerContent()}
          </div>
          {/* Error badge - show when there's an error */}
          {generateAnswerError && (
            <div className="mt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    asChild
                    data-testid="context-insufficient-badge"
                  >
                    <Badge
                      variant="destructive"
                      className={badgeStyles.destructive}
                    >
                      Context insufficient
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-sm text-xs whitespace-pre-wrap"
                  >
                    {generateAnswerError}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
