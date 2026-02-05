"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { RequirementDisplayCard } from "./requirement-display-card";
import { LinkedRequirementsSection } from "./linked-requirements-section";
import {
  RequirementItem,
  Requirement,
  SuggestedAction,
} from "@/types/requirement-types";

interface LinkedRequirementsProps {
  linkedRequirements: Requirement[];
  linkedRequirementsLoading: boolean;
  mergingRequirementId: string | null;
  isFetchingSuggestion?: boolean;
  suggestedAction?: SuggestedAction | null;
}

interface ActionHandlers {
  onEditRequirement: () => void;
  onEditLinkedRequirement: (requirement: Requirement) => void;
  onLinkExistingRequirements: (requirements: Requirement[]) => Promise<void>;
  onUnlinkRequirement: (requirement: Requirement) => Promise<void>;
  onGenerateMerge: (requirement: Requirement) => void;
  onCreateNewRequirement: () => void;
  onFetchSuggestedAction?: () => Promise<void>;
  onConfirmSuggestion?: () => Promise<unknown>;
  onDismissSuggestion?: () => void;
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
    <div className="p-8 space-y-6" data-testid="requirement-details-panel">
      {/* Requirement Display Card */}
      <RequirementDisplayCard
        requirement={selectedRequirement}
        onEdit={actionHandlers.onEditRequirement}
      />

      {/* Linked Requirements Section */}
      <LinkedRequirementsSection
        linkedRequirements={linkedRequirementsProps.linkedRequirements}
        linkedRequirementsLoading={
          linkedRequirementsProps.linkedRequirementsLoading
        }
        mergingRequirementId={linkedRequirementsProps.mergingRequirementId}
        productId={productId}
        onLinkExistingRequirements={actionHandlers.onLinkExistingRequirements}
        onUnlinkRequirement={actionHandlers.onUnlinkRequirement}
        onGenerateMerge={actionHandlers.onGenerateMerge}
        onCreateNewRequirement={actionHandlers.onCreateNewRequirement}
        onEditLinkedRequirement={actionHandlers.onEditLinkedRequirement}
        onFetchSuggestedAction={actionHandlers.onFetchSuggestedAction}
        isFetchingSuggestion={linkedRequirementsProps.isFetchingSuggestion}
        suggestedAction={linkedRequirementsProps.suggestedAction}
        onConfirmSuggestion={actionHandlers.onConfirmSuggestion}
        onDismissSuggestion={actionHandlers.onDismissSuggestion}
      />
    </div>
  );
}
