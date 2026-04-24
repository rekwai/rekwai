"use client";

import { useState } from "react";
import {
  Check,
  Link,
  Merge,
  Plus,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    actionLabel: string;
    actionBg: string;
    actionHover: string;
    actionIcon?: LucideIcon;
    confirmingLabel: string;
  }
> = {
  attach: {
    actionLabel: "Link Requirements",
    actionBg: "bg-semantic-indicator-6 text-semantic-indicator-2",
    actionHover: "hover:bg-semantic-indicator-2 hover:!text-semantic-white",
    actionIcon: Link,
    confirmingLabel: "Linking requirements",
  },
  merge: {
    actionLabel: "Merge Requirements",
    actionBg: "bg-primitive-orange-100 text-semantic-text",
    actionHover: "hover:bg-semantic-indicator-3 hover:!text-semantic-white",
    actionIcon: Merge,
    confirmingLabel: "Merging requirements",
  },
  create_new: {
    actionLabel: "Create Requirement",
    actionBg: "bg-semantic-success-bg text-semantic-black",
    actionHover: "hover:bg-semantic-success-fg hover:!text-semantic-white",
    actionIcon: Plus,
    confirmingLabel: "Creating requirement",
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
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);

  const config = ACTION_CONFIG[suggestion.action];
  const isMerge = suggestion.action === "merge";
  const targetRequirement = suggestion.target_requirement;
  const targetRequirementKey = targetRequirement?.requirement_key;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const renderJustification = () => {
    if (!targetRequirementKey) {
      return suggestion.justification;
    }

    const escapedKey = targetRequirementKey.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const keyRegex = new RegExp(`\\b(${escapedKey})\\b`);
    const parts = suggestion.justification.split(keyRegex);

    if (parts.length === 1) {
      return suggestion.justification;
    }

    return parts.map((part, index) => {
      if (part !== targetRequirementKey) {
        return <span key={`${part}-${index}`}>{part}</span>;
      }

      return (
        <button
          key={`target-key-${index}`}
          type="button"
          className="font-semibold text-semantic-indicator-2 underline underline-offset-2 hover:text-semantic-indicator-2/80"
          onClick={() => setIsRequirementModalOpen(true)}
          data-testid="suggestion-target-requirement-link"
        >
          {part}
        </button>
      );
    });
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleConfirm}
          disabled={isConfirming}
          className={`h-7 gap-2 rounded-[12px] border-none px-2.5 py-1 text-xs leading-[15px] font-normal ${config.actionBg} ${config.actionHover}`}
          data-testid="confirm-suggestion-button"
        >
          {isConfirming ? config.confirmingLabel : config.actionLabel}
          {isConfirming ? (
            <Check size={12} />
          ) : config.actionIcon ? (
            <config.actionIcon size={12} />
          ) : null}
        </Button>
      </div>

      {/* Justification */}
      <p className="font-inter font-medium text-sm text-semantic-text leading-5">
        {renderJustification()}
      </p>

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

      {targetRequirement && (
        <Dialog
          open={isRequirementModalOpen}
          onOpenChange={setIsRequirementModalOpen}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{targetRequirement.requirement_key}</DialogTitle>
            </DialogHeader>
            <RequirementCard
              description={targetRequirement.description}
              typeBadges={<TypeBadges types={targetRequirement.types} />}
              statusBadge={
                <StatusBadge status={targetRequirement.implementation_status} />
              }
              implementationDescription={
                targetRequirement.implementation_description
              }
              verificationDescription={
                targetRequirement.requirement_verification || ""
              }
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
