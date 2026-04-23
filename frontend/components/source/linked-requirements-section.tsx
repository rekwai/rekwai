"use client";

import { useMemo, useState } from "react";
import {
  Requirement,
  RequirementItem as RequirementItemType,
  SuggestedAction,
  MergedRequirement,
  MergeInfo,
  CreateInfo,
} from "@/types/requirement-types";
import { RequirementSelectionModal } from "@/components/query/requirement-selection-modal";
import { AISuggestionBanner } from "./ai-suggestion-banner";
import { MergeStatusBanner } from "./merge-status-banner";
import { CreateStatusBanner } from "./create-status-banner";
import { RequirementCard } from "@/components/common/requirement-card";
import { TypeBadges, StatusBadge } from "@/components/common/requirement-badges";
import { Button } from "@/components/ui/button";

interface SuggestionProps {
  suggestedAction?: SuggestedAction | null;
  lastMergeInfo?: MergeInfo | null;
  lastCreateInfo?: CreateInfo | null;
  mergePreview?: MergedRequirement | null;
  selectedRequirement?: RequirementItemType | null;
}

interface SuggestionHandlers {
  onFetchSuggestedAction?: () => Promise<void>;
  onConfirmSuggestion?: () => Promise<unknown>;
  onEditSuggestion?: () => Promise<unknown>;
  onUndoMerge?: () => Promise<void>;
  onUndoCreate?: () => Promise<void>;
  onEditCreatedRequirement?: (requirement: Requirement) => void;
  onEditRequirement?: () => void;
}

interface LinkedRequirementsSectionProps {
  productId: string;
  linkedRequirements?: Requirement[];
  onEditLinkedRequirement: (requirement: Requirement) => void;
  onLinkExistingRequirements: (requirements: Requirement[]) => Promise<void>;
  suggestion?: SuggestionProps;
  suggestionHandlers?: SuggestionHandlers;
}

export function LinkedRequirementsSection({
  productId,
  linkedRequirements = [],
  onEditLinkedRequirement,
  onLinkExistingRequirements,
  suggestion = {},
  suggestionHandlers = {},
}: LinkedRequirementsSectionProps) {
  const {
    suggestedAction,
    lastMergeInfo,
    lastCreateInfo,
    mergePreview,
    selectedRequirement,
  } = suggestion;
  const {
    onFetchSuggestedAction,
    onConfirmSuggestion,
    onEditSuggestion,
    onUndoMerge,
    onUndoCreate,
    onEditCreatedRequirement,
    onEditRequirement,
  } = suggestionHandlers;
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const emptyLinkedIds = useMemo(() => new Set<string>(), []);
  const linkedSectionTitle =
    selectedRequirement?.linkType === "create"
      ? "Requirement Created"
      : "Linked Requirements";

  const hasSuggestion = !!(suggestedAction && onConfirmSuggestion);

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

        {/* Create Status Banner (post-create with undo/edit) */}
        {lastCreateInfo && onUndoCreate && (
          <CreateStatusBanner
            createdRequirement={lastCreateInfo.createdRequirement}
            isLinked={lastCreateInfo.isLinked}
            onUndo={onUndoCreate}
            onEdit={onEditCreatedRequirement}
          />
        )}

        {/* AI Suggestion Banner */}
        {hasSuggestion && !lastMergeInfo && !lastCreateInfo && (
          <AISuggestionBanner
            suggestion={suggestedAction}
            onConfirm={onConfirmSuggestion}
            onEdit={onEditSuggestion}
            mergePreview={mergePreview}
            extractedRequirement={selectedRequirement}
            onEditExtraction={onEditRequirement}
          />
        )}

        {!lastMergeInfo &&
          !lastCreateInfo &&
          !hasSuggestion &&
          !!onFetchSuggestedAction && (
            <div className="space-y-3" data-testid="linked-requirements-fallback">
              {linkedRequirements.length > 0 ? (
                <>
                  <div className="font-inter text-sm font-semibold text-semantic-text">
                    {linkedSectionTitle}
                  </div>
                  {linkedRequirements.map((requirement) => (
                    <RequirementCard
                      key={requirement.id}
                      title={
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-inter text-xs font-semibold leading-5 text-semantic-text">
                            {requirement.requirement_key}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditLinkedRequirement(requirement)}
                            className="flex flex-row items-center justify-center gap-1.5 rounded-[4px] border border-semantic-stroke bg-semantic-bg-elevation-2 px-2.5 py-1 text-xs text-semantic-text hover:bg-semantic-highlight hover:text-semantic-text active:bg-semantic-highlight"
                            data-testid={`edit-linked-requirement-${requirement.id}`}
                          >
                            Edit
                          </Button>
                        </div>
                      }
                      description={requirement.description}
                      typeBadges={<TypeBadges types={requirement.types} />}
                      statusBadge={
                        <StatusBadge status={requirement.implementation_status} />
                      }
                      implementationDescription={
                        requirement.implementation_description
                      }
                      verificationDescription={
                        requirement.requirement_verification || ""
                      }
                    />
                  ))}
                </>
              ) : (
                <div className="rounded-lg border border-semantic-stroke bg-semantic-bg-elevation-2 p-4 font-inter text-sm text-semantic-text">
                  No active suggestion for this extraction yet.
                </div>
              )}
            </div>
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
