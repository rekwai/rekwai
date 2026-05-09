"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { LinkedRequirementsSection } from "./linked-requirements-section";
import {
  RequirementItem,
  Requirement,
  SuggestedAction,
  MergedRequirement,
  MergeInfo,
  CreateInfo,
} from "@/types/requirement-types";

interface LinkedRequirementsProps {
  linkedRequirements?: Requirement[];
  isFetchingSuggestion?: boolean;
  suggestedAction?: SuggestedAction | null;
  lastMergeInfo?: MergeInfo | null;
  lastCreateInfo?: CreateInfo | null;
  mergePreview?: MergedRequirement | null;
}

interface ActionHandlers {
  onEditRequirement: () => void;
  onEditLinkedRequirement: (requirement: Requirement) => void;
  onLinkExistingRequirements: (requirements: Requirement[]) => Promise<void>;
  onCreateNewRequirement: () => void;
  onFetchSuggestedAction?: () => Promise<void>;
  onConfirmSuggestion?: () => Promise<unknown>;
  onEditSuggestion?: () => Promise<unknown>;
  onUndoMerge?: () => Promise<void>;
  onUndoCreate?: () => Promise<void>;
  onEditCreatedRequirement?: (requirement: Requirement) => void;
}

interface RequirementDetailsPanelProps {
  selectedRequirement: RequirementItem | null;
  requirements: RequirementItem[];
  combinedLoading: boolean;
  productId: string;
  linkedRequirementsProps: LinkedRequirementsProps;
  actionHandlers: ActionHandlers;
}

export function RequirementDetailsPanel({
  selectedRequirement,
  requirements,
  combinedLoading,
  productId,
  linkedRequirementsProps,
  actionHandlers,
}: RequirementDetailsPanelProps) {
  if (combinedLoading) {
    return (
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (requirements.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-gray-500 dark:text-[#FAFFFD]">
        No requirements were extracted from this document.
      </div>
    );
  }

  if (!selectedRequirement) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-gray-500 dark:text-[#FAFFFD]">
        Select a requirement to view details.
      </div>
    );
  }

  return (
    <div
      className="min-h-full space-y-6 px-8 pt-8 pb-20"
      data-testid="requirement-details-panel"
    >
      <LinkedRequirementsSection
        productId={productId}
        linkedRequirements={linkedRequirementsProps.linkedRequirements || []}
        onCreateNewRequirement={actionHandlers.onCreateNewRequirement}
        onEditLinkedRequirement={actionHandlers.onEditLinkedRequirement}
        onLinkExistingRequirements={actionHandlers.onLinkExistingRequirements}
        suggestion={{
          isFetchingSuggestion: linkedRequirementsProps.isFetchingSuggestion,
          suggestedAction: linkedRequirementsProps.suggestedAction,
          lastMergeInfo: linkedRequirementsProps.lastMergeInfo,
          lastCreateInfo: linkedRequirementsProps.lastCreateInfo,
          mergePreview: linkedRequirementsProps.mergePreview,
          selectedRequirement,
        }}
        suggestionHandlers={{
          onFetchSuggestedAction: actionHandlers.onFetchSuggestedAction,
          onConfirmSuggestion: actionHandlers.onConfirmSuggestion,
          onEditSuggestion: actionHandlers.onEditSuggestion,
          onUndoMerge: actionHandlers.onUndoMerge,
          onUndoCreate: actionHandlers.onUndoCreate,
          onEditCreatedRequirement: actionHandlers.onEditCreatedRequirement,
          onEditRequirement: actionHandlers.onEditRequirement,
        }}
      />
    </div>
  );
}
