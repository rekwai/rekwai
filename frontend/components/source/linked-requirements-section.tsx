"use client";

import { useMemo, useState } from "react";
import {
  Requirement,
  RequirementItem as RequirementItemType,
  SuggestedAction,
  MergedRequirement,
  MergeInfo,
} from "@/types/requirement-types";
import { RequirementSelectionModal } from "@/components/query/requirement-selection-modal";
import { AISuggestionBanner } from "./ai-suggestion-banner";
import { DismissedSuggestionBanner } from "./dismissed-suggestion-banner";
import { MergeStatusBanner } from "./merge-status-banner";

interface SuggestionProps {
  isFetchingSuggestion?: boolean;
  suggestedAction?: SuggestedAction | null;
  isSuggestionDismissed?: boolean;
  lastMergeInfo?: MergeInfo | null;
  mergePreview?: MergedRequirement | null;
  selectedRequirement?: RequirementItemType | null;
}

interface SuggestionHandlers {
  onFetchSuggestedAction?: () => Promise<void>;
  onConfirmSuggestion?: () => Promise<unknown>;
  onDismissSuggestion?: () => void;
  onEditSuggestion?: () => Promise<unknown>;
  onUndoMerge?: () => Promise<void>;
  onEditRequirement?: () => void;
}

interface LinkedRequirementsSectionProps {
  productId: string;
  onCreateNewRequirement: () => void;
  onEditLinkedRequirement: (requirement: Requirement) => void;
  onLinkExistingRequirements: (requirements: Requirement[]) => Promise<void>;
  suggestion?: SuggestionProps;
  suggestionHandlers?: SuggestionHandlers;
}

export function LinkedRequirementsSection({
  productId,
  onCreateNewRequirement,
  onEditLinkedRequirement,
  onLinkExistingRequirements,
  suggestion = {},
  suggestionHandlers = {},
}: LinkedRequirementsSectionProps) {
  const {
    isFetchingSuggestion = false,
    suggestedAction,
    isSuggestionDismissed = false,
    lastMergeInfo,
    mergePreview,
    selectedRequirement,
  } = suggestion;
  const {
    onFetchSuggestedAction,
    onConfirmSuggestion,
    onDismissSuggestion,
    onEditSuggestion,
    onUndoMerge,
    onEditRequirement,
  } = suggestionHandlers;
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const emptyLinkedIds = useMemo(() => new Set<string>(), []);

  const hasSuggestion = !!(suggestedAction && onConfirmSuggestion && onDismissSuggestion);

  return (
    <>
      <div className="flex-1 space-y-4">
        {/* Merge Status Banner (post-merge with undo) */}
        {lastMergeInfo && onUndoMerge && (
          <MergeStatusBanner
            targetRequirementKey={lastMergeInfo.targetReqKey}
            mergedRequirement={lastMergeInfo.mergedRequirement}
            onUndo={onUndoMerge}
            onEdit={onEditLinkedRequirement}
          />
        )}

        {/* AI Suggestion Banner */}
        {hasSuggestion && !lastMergeInfo && (
          <AISuggestionBanner
            suggestion={suggestedAction}
            onConfirm={onConfirmSuggestion}
            onDismiss={onDismissSuggestion}
            onEdit={onEditSuggestion}
            mergePreview={mergePreview}
            extractedRequirement={selectedRequirement}
            onEditExtraction={onEditRequirement}
          />
        )}

        {/* Dismissed Suggestion Banner */}
        {!hasSuggestion && isSuggestionDismissed && onFetchSuggestedAction && (
          <DismissedSuggestionBanner
            onRerun={onFetchSuggestedAction}
            onAttachToRequirement={() => setIsSelectionModalOpen(true)}
            onAddRequirement={onCreateNewRequirement}
            isRerunning={isFetchingSuggestion}
            extractedRequirement={selectedRequirement ?? undefined}
            onEditExtraction={onEditRequirement}
          />
        )}
      </div>

      {/* Requirement Selection Modal - for "Attach to requirement" in dismissed state */}
      <RequirementSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        productId={productId}
        onSelectRequirements={async (selected) => {
          setIsSelectionModalOpen(false);
          await onLinkExistingRequirements(selected);
        }}
        alreadyLinkedIds={emptyLinkedIds}
      />
    </>
  );
}
