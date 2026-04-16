"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RequirementCard } from "@/components/common/requirement-card";
import { PreviewCard } from "@/components/common/preview-card";
import { WordDiff } from "@/components/common/word-diff";
import { MergedRequirement, Requirement } from "@/types/requirement-types";

type ViewMode = "suggestion" | "original";

interface MergeDiffCardProps {
  mergedData: MergedRequirement;
  targetRequirement: Requirement;
  onEdit?: () => void | Promise<unknown>;
}

function CheckboxToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-1 cursor-pointer">
      <div
        className={`flex items-center justify-center w-3.5 h-3.5 rounded-[3px] ${
          checked
            ? "bg-[#3E63DD] shadow-[inset_0px_1.5px_2px_rgba(0,0,0,0.1),inset_0px_1.5px_2px_rgba(0,0,85,0.024)]"
            : "bg-white border border-[rgba(0,0,45,0.09)]"
        }`}
        onClick={() => onChange(!checked)}
      >
        {checked && <Check size={10} className="text-white" />}
      </div>
      <span className="font-inter font-normal text-sm text-semantic-text">
        {label}
      </span>
    </label>
  );
}

function ViewToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <div
      className="flex items-center gap-4 text-xs"
      data-testid="merge-view-toggle"
    >
      <CheckboxToggle
        checked={viewMode === "suggestion"}
        onChange={() => onViewModeChange("suggestion")}
        label="Show Suggestion"
      />
      <CheckboxToggle
        checked={viewMode === "original"}
        onChange={() => onViewModeChange("original")}
        label="Show Original"
      />
    </div>
  );
}

const TYPE_BADGE_CLASS =
  "flex flex-row justify-center items-center px-1.5 py-0.5 gap-1.5 h-5 bg-[#E6E6E6] rounded-[3px] font-inter font-medium text-xs leading-4 tracking-[0.04px] text-[#080705]";
const NEW_TYPE_BADGE_CLASS =
  "flex flex-row justify-center items-center px-1.5 py-0.5 gap-1.5 h-5 bg-amber-50 rounded-[3px] font-inter font-medium text-xs leading-4 tracking-[0.04px] text-amber-700";

export function MergeDiffCard({
  mergedData,
  targetRequirement,
  onEdit,
}: MergeDiffCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("suggestion");

  const existingTypes = new Set(targetRequirement.types);
  const newTypes = mergedData.types.filter((t) => !existingTypes.has(t));
  const unchangedTypes = mergedData.types.filter((t) => existingTypes.has(t));

  const isOriginal = viewMode === "original";

  const displayStatus = isOriginal
    ? targetRequirement.implementation_status
    : mergedData.implementation_status;

  const verificationText = isOriginal
    ? targetRequirement.requirement_verification || ""
    : mergedData.requirement_verification ||
      targetRequirement.requirement_verification ||
      "";

  return (
    <PreviewCard
      testId="merge-diff-card"
      onEdit={onEdit}
      editTestId="edit-merge-preview-button"
      headerRight={
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      }
    >
      <RequirementCard
        description={
          isOriginal ? (
            targetRequirement.description
          ) : (
            <WordDiff
              oldText={targetRequirement.description}
              newText={mergedData.description}
            />
          )
        }
        typeBadges={
          isOriginal ? (
            targetRequirement.types.map((type, index) => (
              <Badge key={index} className={TYPE_BADGE_CLASS}>
                {type}
              </Badge>
            ))
          ) : (
            <>
              {unchangedTypes.map((type, index) => (
                <Badge key={index} className={TYPE_BADGE_CLASS}>
                  {type}
                </Badge>
              ))}
              {newTypes.map((type, index) => (
                <Badge key={`new-${index}`} className={NEW_TYPE_BADGE_CLASS}>
                  {type}
                </Badge>
              ))}
            </>
          )
        }
        statusBadge={
          <Badge className="px-1.5 py-0.5 text-xs font-medium rounded-[3px] bg-[#A2CFCA] text-[#080705]">
            {displayStatus}
          </Badge>
        }
        implementationDescription={
          isOriginal ? (
            targetRequirement.implementation_description
          ) : (
            <WordDiff
              oldText={targetRequirement.implementation_description}
              newText={mergedData.implementation_description}
            />
          )
        }
        verificationDescription={
          verificationText ? (
            isOriginal ? (
              verificationText
            ) : (
              <span className="line-through text-semantic-text">
                {verificationText}
              </span>
            )
          ) : undefined
        }
      />
    </PreviewCard>
  );
}
