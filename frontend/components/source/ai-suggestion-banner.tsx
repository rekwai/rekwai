"use client";

import { useState } from "react";
import { Check, ExternalLink, Sparkles, Merge, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequirementCard } from "@/components/common/requirement-card";
import { PreviewCard } from "@/components/common/preview-card";
import { TypeBadges, StatusBadge } from "@/components/common/requirement-badges";
import { MergeDiffCard } from "./merge-diff-card";
import {
  SuggestedAction,
  SuggestedActionType,
  MergedRequirement,
  RequirementItem as RequirementItemType,
} from "@/types/requirement-types";

interface AISuggestionBannerProps {
  suggestion: SuggestedAction;
  onConfirm: () => Promise<unknown>;
  onEdit?: () => Promise<unknown>;
  mergePreview?: MergedRequirement | null;
  extractedRequirement?: RequirementItemType | null;
  onEditExtraction?: () => void;
}

const ACTION_CONFIG: Record<
  SuggestedActionType,
  {
    badgeLabel: string;
    badgeBg: string;
    badgeIcon?: typeof Merge;
    confirmLabel: string;
    confirmingLabel: string;
    confirmBg: string;
    confirmIcon?: typeof Merge;
  }
> = {
  attach: {
    badgeLabel: "Attach to Requirement",
    badgeBg: "bg-semantic-indicator-6 text-semantic-indicator-2",
    confirmLabel: "Attach to requirement",
    confirmingLabel: "Attaching to requirement",
    confirmBg: "bg-semantic-emphasis text-semantic-white hover:bg-semantic-black",
  },
  merge: {
    badgeLabel: "Merge Requirements",
    badgeBg: "bg-primitive-orange-100 text-semantic-text",
    badgeIcon: Merge,
    confirmLabel: "Merge Requirements",
    confirmingLabel: "Merging requirements",
    confirmBg: "bg-semantic-indicator-3 text-semantic-white hover:bg-semantic-indicator-3",
    confirmIcon: Merge,
  },
  create_new: {
    badgeLabel: "Create Requirement",
    badgeBg: "bg-semantic-success-bg text-semantic-text",
    badgeIcon: Plus,
    confirmLabel: "Create Requirement",
    confirmingLabel: "Creating requirement",
    confirmBg: "bg-semantic-emphasis text-semantic-white hover:bg-semantic-black",
    confirmIcon: Plus,
  },
};

export function AISuggestionBanner({
  suggestion,
  onConfirm,
  onEdit,
  mergePreview,
  extractedRequirement,
  onEditExtraction,
}: AISuggestionBannerProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const config = ACTION_CONFIG[suggestion.action];
  const isMerge = suggestion.action === "merge";

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-3"
      data-testid="ai-suggestion-banner"
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-semantic-text" />
        <span className="font-inter font-semibold text-base text-semantic-text">
          Suggestion
        </span>
        <Badge
          className={`flex items-center gap-1.5 px-1.5 py-0.5 text-xs font-medium rounded-[3px] ${config.badgeBg}`}
        >
          {config.badgeLabel}
          {config.badgeIcon ? <config.badgeIcon size={12} /> : <ExternalLink size={10} />}
        </Badge>
      </div>

      {/* Justification */}
      <p className="font-inter font-medium text-sm text-semantic-text leading-5">
        {suggestion.justification}
      </p>

      {/* Action buttons — between justification and preview */}
      <div className="flex items-center justify-end gap-4">
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={isConfirming}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 h-7 rounded-[12px] ${config.confirmBg}`}
          data-testid="confirm-suggestion-button"
        >
          {isConfirming ? config.confirmingLabel : config.confirmLabel}
          {config.confirmIcon ? <config.confirmIcon size={12} /> : isConfirming ? <Check size={12} /> : null}
        </Button>
      </div>

      {/* Preview */}
      {isMerge && mergePreview && suggestion.target_requirement ? (
        <MergeDiffCard
          mergedData={mergePreview}
          targetRequirement={suggestion.target_requirement}
          onEdit={onEdit}
        />
      ) : suggestion.action === "create_new" && extractedRequirement ? (
        <PreviewCard
          testId="create-preview-card"
          onEdit={onEditExtraction}
          editTestId="edit-create-preview-button"
        >
          <RequirementCard
            description={extractedRequirement.text || extractedRequirement.description}
            typeBadges={<TypeBadges types={extractedRequirement.types} />}
            statusBadge={<StatusBadge status={extractedRequirement.implementation} />}
            implementationDescription={extractedRequirement.implementationDescription || ""}
            verificationDescription={extractedRequirement.requirementVerification || ""}
          />
        </PreviewCard>
      ) : suggestion.target_requirement ? (
        <RequirementCard
          description={suggestion.target_requirement.description}
          typeBadges={<TypeBadges types={suggestion.target_requirement.types} />}
          statusBadge={<StatusBadge status={suggestion.target_requirement.implementation_status} />}
          implementationDescription={
            suggestion.target_requirement.implementation_description
          }
          showVerification={false}
          title={
            <span className="font-inter text-xs font-semibold leading-5 text-semantic-text">
              {suggestion.target_requirement.requirement_key}
            </span>
          }
        />
      ) : null}
    </div>
  );
}
