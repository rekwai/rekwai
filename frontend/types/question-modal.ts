import { QuestionnaireQuestion } from "@/types/query-types";
import { Requirement } from "@/types/requirement-types";
import { UseRequirementActionsReturn } from "../hooks/use-requirement-actions";

export interface QuestionListPanelProps {
  questions: QuestionnaireQuestion[];
  selectedIndex: number;
  selectedTab: "questions" | "metadata";
  isLoadingQuestions?: boolean;
  questionsError?: string | null;
  questionnaireId: string | null;
  questionnaireKey: string | null;
  clientName: string | null;
  requirements: Requirement[];
  onIndexChange: (index: number) => void;
  onTabChange: (tab: "questions" | "metadata") => void;
}

export interface QuestionDetailsPanelProps {
  selectedQuestion: QuestionnaireQuestion | undefined;
  questions: QuestionnaireQuestion[];
  selectedIndex: number;
  productId: string | null;
  questionnaireId: string | null;
  onQuestionsUpdate: (questions: QuestionnaireQuestion[]) => void;
  requirementActions: UseRequirementActionsReturn;
}

export interface AnswerGenerationSectionProps {
  selectedQuestion: QuestionnaireQuestion;
  isEditingResult: boolean;
  editedResult: string;
  isGeneratingAnswer: boolean;
  generateAnswerError: string | null;
  saveAnswerError: string | null;
  hasNoRequirements?: boolean;
  onEditingChange: (editing: boolean) => void;
  onResultChange: (result: string) => void;
  onGenerateAnswer: () => void;
  onSaveAnswer: () => void;
  onCancelEdit: () => void;
}
