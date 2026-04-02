"use client";

import { useState } from "react";
import { X, Check, ExternalLink, Sparkles, Merge, Plus } from "lucide-react";
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
  onDismiss: () => void;
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
    badgeBg: "bg-[#E8F2FC] text-[#0E309F]",
    confirmLabel: "Attach to requirement",
    confirmingLabel: "Attaching to requirement",
    confirmBg: "bg-[#080705] text-white hover:bg-[#2a2a2a]",
  },
  merge: {
    badgeLabel: "Merge Requirements",
    badgeBg: "bg-[#F4D5C8] text-[#080705]",
    badgeIcon: Merge,
    confirmLabel: "Merge Requirements",
    confirmingLabel: "Merging requirements",
    confirmBg: "bg-[#EB5110] text-[#FAFFFD] hover:bg-[#EB5110]/90",
    confirmIcon: Merge,
  },
  create_new: {
    badgeLabel: "Create Requirement",
    badgeBg: "bg-[#A2CFCA] text-[#080705]",
    badgeIcon: Plus,
    confirmLabel: "Create Requirement",
    confirmingLabel: "Creating requirement",
    confirmBg: "bg-[#080705] text-white hover:bg-[#2a2a2a]",
    confirmIcon: Plus,
  },
};

export function AISuggestionBanner({
  suggestion,
  onConfirm,
  onDismiss,
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
        <Sparkles size={16} className="text-[#080705]" />
        <span className="font-inter font-semibold text-base text-[#080705]">
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
      <p className="font-inter font-medium text-sm text-[#000000] leading-5">
        {suggestion.justification}
      </p>

      {/* Action buttons — between justification and preview */}
      <div className="flex items-center justify-end gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          disabled={isConfirming}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 h-7 rounded-[12px] bg-[#F6F6F6] hover:bg-[#E6E6E6] text-[#080705]"
          data-testid="dismiss-suggestion-button"
        >
          Dismiss Suggestion
          <X size={12} />
        </Button>
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
          header={
            <span className="font-inter font-semibold text-xs leading-5 text-[#080705]">
              {suggestion.target_requirement.requirement_key}
            </span>
          }
        />
      ) : null}
    </div>
  );
}
