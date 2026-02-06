"use client";

import { useState } from "react";
import {
  Check,
  X,
  Loader2,
  Sparkles,
  Link,
  Merge,
  Plus,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequirementCard } from "@/components/common/requirement-card";
import { MergeDiffCard } from "./merge-diff-card";
import {
  SuggestedAction,
  SuggestedActionType,
  MergedRequirement,
} from "@/types/requirement-types";

interface AISuggestionBannerProps {
  suggestion: SuggestedAction;
  onConfirm: () => Promise<unknown>;
  onDismiss: () => void;
  onEdit?: () => Promise<unknown>;
  mergePreview?: MergedRequirement | null;
}

const ACTION_CONFIG: Record<
  SuggestedActionType,
  { label: string; icon: typeof Link; color: string; badgeBg: string }
> = {
  attach: {
    label: "Attach",
    icon: Link,
    color: "text-blue-700",
    badgeBg: "bg-blue-50 border-blue-200 text-blue-700",
  },
  merge: {
    label: "Merge",
    icon: Merge,
    color: "text-amber-700",
    badgeBg: "bg-amber-50 border-amber-200 text-amber-700",
  },
  create_new: {
    label: "Create new",
    icon: Plus,
    color: "text-green-700",
    badgeBg: "bg-green-50 border-green-200 text-green-700",
  },
};

export function AISuggestionBanner({
  suggestion,
  onConfirm,
  onDismiss,
  onEdit,
  mergePreview,
}: AISuggestionBannerProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const config = ACTION_CONFIG[suggestion.action];
  const ActionIcon = config.icon;
  const isMerge = suggestion.action === "merge";
  const isActing = isConfirming || isEditing;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const handleEdit = async () => {
    if (!onEdit) return;
    setIsEditing(true);
    try {
      await onEdit();
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-3 p-4 border border-[#E6E6E6] rounded-lg bg-[#FAFAFA]"
      data-testid="ai-suggestion-banner"
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-[#080705] flex-none" />
        <span className="font-inter font-semibold text-sm text-[#080705]">
          Rekwai Suggestion
        </span>
        <Badge
          className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${config.badgeBg}`}
        >
          <ActionIcon size={10} />
          {config.label}
        </Badge>
      </div>

      {/* Justification */}
      <p className="font-inter text-sm text-[#1C2024] leading-[150%]">
        {suggestion.justification}
      </p>

      {/* Target requirement preview */}
      {suggestion.target_requirement &&
        (isMerge && mergePreview ? (
          <MergeDiffCard
            mergedData={mergePreview}
            targetRequirement={suggestion.target_requirement}
            header={
              <span className="font-inter font-semibold text-xs leading-5 text-[#080705]">
                {suggestion.target_requirement.requirement_key}
              </span>
            }
          />
        ) : (
          <RequirementCard
            description={suggestion.target_requirement.description}
            types={suggestion.target_requirement.types}
            implementationStatus={
              suggestion.target_requirement.implementation_status
            }
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
        ))}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={isActing}
          className="flex items-center gap-1.5 bg-[#080705] text-white hover:bg-[#2a2a2a] text-xs px-3 py-1.5 h-7 rounded-md"
          data-testid="confirm-suggestion-button"
        >
          {isConfirming ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
          Confirm
        </Button>
        {isMerge && onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            disabled={isActing}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 h-7 rounded-md border-[#E6E6E6] text-[#080705] hover:bg-[#E6E6E6]"
            data-testid="edit-suggestion-button"
          >
            {isEditing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Pencil size={12} />
            )}
            Edit
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          disabled={isActing}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 h-7 rounded-md text-[#080705] hover:bg-[#E6E6E6]"
          data-testid="dismiss-suggestion-button"
        >
          <X size={12} />
          Dismiss
        </Button>
      </div>
    </div>
  );
}
