"use client";

import { useState, useEffect } from "react";
import { QuestionHeader } from "@/components/query/question-header";
import { QuestionListPanel } from "@/components/query/question-list-panel";
import { QuestionDetailsPanel } from "@/components/query/question-details-panel";
import { QuestionNavigationFooter } from "@/components/query/question-navigation-footer";
import { useRequirementActions } from "@/hooks/use-requirement-actions";
import {
  getQuestionnaireQuestions,
  getQuestionnaireDetails,
} from "@/lib/api/questionnaires";
import { getProductByKey } from "@/lib/api/products";
import { QuestionnaireQuestion } from "@/types/query-types";
import {
  PageLoadingState,
  PageErrorState,
  PageNotFoundState,
} from "@/components/common/page-states";
import { useResolvedParams } from "@/hooks/use-resolved-params";

export default function QueryPage({
  params,
}: {
  params: Promise<{ productKey: string; queryKey: string }>;
}) {
  const resolvedParams = useResolvedParams(params);
  const productKey = resolvedParams?.productKey ?? null;
  const queryKey = resolvedParams?.queryKey ?? null;

  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionnaireQuestion[] | null>(
    null,
  );
  const [clientName, setClientName] = useState<string>("");
  const [productId, setProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedTab, setSelectedTab] = useState<"questions" | "metadata">(
    "questions",
  );

  const selectedQuestion = questions?.[selectedIndex];

  const requirementActions = useRequirementActions({
    selectedQuestion,
    questionnaireId: questionnaireId,
    productId,
  });

  useEffect(() => {
    if (!productKey || !queryKey) return;

    const loadQuestionnaire = async () => {
      try {
        setLoading(true);

        // Fetch questionnaire details, questions, and product info in parallel
        const [details, questionsList, product] = await Promise.all([
          getQuestionnaireDetails(queryKey),
          getQuestionnaireQuestions(queryKey),
          getProductByKey(productKey),
        ]);

        setQuestionnaireId(details.id);
        setProductId(details.product_id);
        setClientName(details.client_name);
        setProductName(product.name);
        setQuestions(questionsList);
      } catch (err) {
        console.error("Failed to load questionnaire:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load questionnaire",
        );
      } finally {
        setLoading(false);
      }
    };
    loadQuestionnaire();
  }, [productKey, queryKey]);

  if (loading) {
    return (
      <PageLoadingState
        title="Loading Questionnaire..."
        description="Please wait while we fetch the questionnaire and its questions..."
      />
    );
  }

  if (error) {
    return <PageErrorState error={error} />;
  }

  if (
    !questions ||
    !productKey ||
    !queryKey ||
    !productId ||
    !questionnaireId
  ) {
    return (
      <PageNotFoundState
        title="No Questionnaire Found"
        description="The requested questionnaire could not be found."
      />
    );
  }

  // ============================================
  // LAYOUT STRUCTURE
  // ============================================
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none">
        <QuestionHeader
          productKey={productKey}
          productName={productName}
          questionnaireId={questionnaireId}
          clientName={clientName}
          queryKey={queryKey}
        />
      </div>

      {/* Main Content - split 50/50 horizontally */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - 50% width, scrollable */}
        <div className="w-1/2 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
          <QuestionListPanel
            questions={questions}
            selectedIndex={selectedIndex}
            selectedTab={selectedTab}
            questionnaireId={questionnaireId}
            questionnaireKey={queryKey}
            clientName={clientName}
            requirements={requirementActions.requirements}
            onIndexChange={setSelectedIndex}
            onTabChange={setSelectedTab}
            onQuestionsUpdate={setQuestions}
          />
        </div>

        {/* Right Panel - 50% width, scrollable */}
        <div className="w-1/2 overflow-y-auto bg-[#FAFFFD] dark:bg-[#121212]">
          <QuestionDetailsPanel
            selectedQuestion={selectedQuestion}
            questions={questions}
            selectedIndex={selectedIndex}
            productId={productId}
            questionnaireId={questionnaireId}
            onQuestionsUpdate={setQuestions}
            requirementActions={requirementActions}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex-none">
        {selectedQuestion && (
          <QuestionNavigationFooter
            selectedQuestion={selectedQuestion}
            questions={questions}
            selectedIndex={selectedIndex}
            onQuestionChange={setSelectedIndex}
            onQuestionsUpdate={setQuestions}
          />
        )}
      </div>
    </div>
  );
}
