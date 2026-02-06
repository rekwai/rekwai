"use client";

import { useState, useMemo } from "react";
import { Plus, Link } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Requirement,
  SuggestedAction,
  MergedRequirement,
} from "@/types/requirement-types";
import { RequirementItem } from "@/components/query/requirement-item";
import { RequirementSelectionModal } from "@/components/query/requirement-selection-modal";
import { LinkedRequirementsHeader } from "./linked-requirements-header";
import { AISuggestionBanner } from "./ai-suggestion-banner";
import { withLoadingState } from "@/lib/utils/loading-state";

interface LinkedRequirementsSectionProps {
  linkedRequirements: Requirement[];
  linkedRequirementsLoading: boolean;
  mergingRequirementId: string | null;
  productId: string;
  onLinkExistingRequirements: (requirements: Requirement[]) => Promise<void>;
  onUnlinkRequirement: (requirement: Requirement) => Promise<void>;
  onGenerateMerge: (requirement: Requirement) => void;
  onCreateNewRequirement: () => void;
  onEditLinkedRequirement: (requirement: Requirement) => void;
  onFetchSuggestedAction?: () => Promise<void>;
  isFetchingSuggestion?: boolean;
  suggestedAction?: SuggestedAction | null;
  onConfirmSuggestion?: () => Promise<unknown>;
  onDismissSuggestion?: () => void;
  onEditSuggestion?: () => Promise<unknown>;
  mergePreview?: MergedRequirement | null;
}

export function LinkedRequirementsSection({
  linkedRequirements,
  linkedRequirementsLoading,
  mergingRequirementId,
  productId,
  onLinkExistingRequirements,
  onUnlinkRequirement,
  onGenerateMerge,
  onCreateNewRequirement,
  onEditLinkedRequirement,
  onFetchSuggestedAction,
  isFetchingSuggestion = false,
  suggestedAction,
  onConfirmSuggestion,
  onDismissSuggestion,
  onEditSuggestion,
  mergePreview,
}: LinkedRequirementsSectionProps) {
  const [unlinkingRequirementIds, setUnlinkingRequirementIds] = useState<
    Set<string>
  >(new Set());
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

  const handleIgnoreRequirement = async (requirement: Requirement) => {
    const reqId = requirement.id.toString();
    await withLoadingState(reqId, setUnlinkingRequirementIds, async () => {
      await onUnlinkRequirement(requirement);
    });
  };

  const handleSelectRequirements = async (
    selectedRequirements: Requirement[],
  ) => {
    // Close the modal immediately
    setIsSelectionModalOpen(false);

    // Link all requirements at once - let errors propagate to caller
    await onLinkExistingRequirements(selectedRequirements);
  };

  // Create a Set of linked requirement IDs for the modal (memoized to avoid recalculation)
  const linkedIds = useMemo(
    () => new Set(linkedRequirements.map((r) => r.id.toString())),
    [linkedRequirements],
  );

  const hasSuggestion = !!(suggestedAction && onConfirmSuggestion && onDismissSuggestion);
  const showEmptyState =
    !linkedRequirementsLoading && linkedRequirements.length === 0 && !hasSuggestion;

  return (
    <>
      <div className="flex-1 space-y-4">
        <LinkedRequirementsHeader
          onCreateNewRequirement={onCreateNewRequirement}
          onOpenLinkModal={() => setIsSelectionModalOpen(true)}
          onFetchSuggestedAction={onFetchSuggestedAction}
          isFetchingSuggestion={isFetchingSuggestion}
        />

        {/* AI Suggestion Banner */}
        {hasSuggestion && (
          <AISuggestionBanner
            suggestion={suggestedAction}
            onConfirm={onConfirmSuggestion}
            onDismiss={onDismissSuggestion}
            onEdit={onEditSuggestion}
            mergePreview={mergePreview}
          />
        )}

        {showEmptyState ? (
          // Empty state action buttons (hidden when AI suggestion is showing)
          <div className="flex flex-row items-start p-0 gap-4 w-full h-[87px]">
            {/* Create requirement button */}
            <button
              onClick={onCreateNewRequirement}
              className="box-border flex flex-col justify-center items-center py-3 px-3 gap-2 flex-1 h-[87px] border border-[#E6E6E6] rounded-[10px] hover:bg-gray-50 transition-colors"
              data-testid="create-requirement-action-button"
            >
              <Plus size={16} className="text-[#080705] flex-none" />
              <span className="font-inter font-medium text-sm leading-[130%] text-[#000000] flex-none">
                Create requirement
              </span>
              <span className="font-inter font-normal text-[10px] leading-[130%] text-center text-[#1C2024] flex-none">
                This will create a new requirement based on the extracted
                requirement.
              </span>
            </button>

            {/* Link requirement button */}
            <button
              onClick={() => setIsSelectionModalOpen(true)}
              className="box-border flex flex-col justify-center items-center py-3 px-3 gap-2 flex-1 h-[87px] border border-[#E6E6E6] rounded-[10px] hover:bg-gray-50 transition-colors"
              data-testid="link-requirement-action-button"
            >
              <Link size={16} className="text-[#080705] flex-none" />
              <span className="font-inter font-medium text-sm leading-[130%] text-[#000000] flex-none">
                Link requirement(s)
              </span>
              <span className="font-inter font-normal text-[10px] leading-[130%] text-center text-[#1C2024] flex-none">
                This will allow you to select and link associated requirements.
              </span>
            </button>
          </div>
        ) : (
          // Requirements list (loading or populated)
          <div className="space-y-3" data-testid="linked-requirements-list">
            {linkedRequirementsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              linkedRequirements.map((linkedReq) => {
                const reqId = linkedReq.id.toString();
                const isToggling = unlinkingRequirementIds.has(reqId);
                const isMerging = mergingRequirementId === reqId;

                return (
                  <RequirementItem
                    key={linkedReq.id}
                    requirement={linkedReq}
                    isToggling={isToggling}
                    isMerging={isMerging}
                    onEdit={onEditLinkedRequirement}
                    onMerge={onGenerateMerge}
                    onIgnore={handleIgnoreRequirement}
                  />
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Requirement Selection Modal - rendered once */}
      <RequirementSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        productId={productId}
        onSelectRequirements={handleSelectRequirements}
        alreadyLinkedIds={linkedIds}
      />
    </>
  );
}
