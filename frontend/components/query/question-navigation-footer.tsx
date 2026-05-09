"use client";

import { Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuestionnaireQuestion } from "@/types/query-types";
import { useQuestionDeletion } from "@/hooks/use-question-deletion";
import { NavigationFooter } from "@/components/common/navigation-footer";

interface QuestionNavigationFooterProps {
  selectedQuestion: QuestionnaireQuestion;
  questions: QuestionnaireQuestion[];
  selectedIndex: number;
  onQuestionChange: (index: number) => void;
  onQuestionsUpdate: (questions: QuestionnaireQuestion[]) => void;
}

export function QuestionNavigationFooter({
  selectedQuestion,
  questions,
  selectedIndex,
  onQuestionChange,
  onQuestionsUpdate,
}: QuestionNavigationFooterProps) {
  const { handleDeleteQuestion, isDeleting } = useQuestionDeletion({
    questions,
    selectedIndex,
    onQuestionsUpdate,
    onQuestionChange,
  });

  return (
    <NavigationFooter
      itemCount={questions.length}
      selectedIndex={selectedIndex}
      onIndexChange={onQuestionChange}
      moreActions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center justify-center p-1 px-2.5 gap-1 w-8 h-7 bg-semantic-bg-elevation-1 border border-semantic-stroke rounded-[4px] hover:bg-semantic-highlight"
              data-testid="more-options-button"
            >
              <MoreHorizontal size={16} className="text-semantic-text" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                selectedQuestion?.id &&
                handleDeleteQuestion(selectedQuestion.id)
              }
              disabled={isDeleting}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 size={16} className="mr-2" />
              Delete Question
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}
