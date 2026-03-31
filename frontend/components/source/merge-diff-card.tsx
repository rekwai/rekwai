"use client";

import { useState } from "react";
import { Pencil, Check } from "lucide-react";
import { diffWords } from "diff";
import { Badge } from "@/components/ui/badge";
import { MergedRequirement, Requirement } from "@/types/requirement-types";

type ViewMode = "suggestion" | "original";

interface MergeDiffCardProps {
  mergedData: MergedRequirement;
  targetRequirement: Requirement;
  onEdit?: () => void;
}

function WordDiff({
  oldText,
  newText,
}: {
  oldText: string;
  newText: string;
}) {
  const changes = diffWords(oldText, newText);

  return (
    <span>
      {changes.map((part, i) => {
        if (part.removed) {
          return (
            <span
              key={i}
              className="line-through text-muted-foreground/60 px-0.5"
            >
              {part.value}
            </span>
          );
        }
        if (part.added) {
          return (
            <span
              key={i}
              className="bg-amber-50 text-amber-700 rounded px-0.5"
            >
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
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
        {checked && (
          <Check size={10} className="text-white" />
        )}
      </div>
      <span className="font-inter font-normal text-sm text-[#080705]">
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

  const statusChanged =
    mergedData.implementation_status !==
    targetRequirement.implementation_status;

  const isOriginal = viewMode === "original";

  const displayStatus = isOriginal
    ? targetRequirement.implementation_status
    : mergedData.implementation_status;

  return (
    <div
      className="flex flex-col items-start p-0 border border-[#E6E6E6] rounded-lg flex-none self-stretch flex-grow-0 bg-[#F6F6F6]"
      data-testid="merge-diff-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 w-full h-[52px] bg-white border-b border-[#E6E6E6] rounded-t-lg">
        <div className="flex items-center gap-4">
          <span className="font-inter font-semibold text-base text-[#080705]">
            Preview
          </span>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1 font-inter text-xs bg-[#F6F6F6] px-2.5 py-1 h-7 rounded-[12px] text-[#080705] hover:bg-[#E6E6E6]"
              data-testid="edit-merge-preview-button"
            >
              Edit
              <Pencil size={12} />
            </button>
          )}
        </div>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Content */}
      <div className="flex flex-col items-start p-6 gap-6 flex-none order-1 self-stretch flex-grow-0 w-full">
        {/* Description field */}
        <div className="flex flex-col items-start p-0 gap-1 flex-none order-0 self-stretch flex-grow-0">
          <div className="flex flex-row items-center gap-2 w-full flex-wrap">
            <span className="font-inter font-bold text-base leading-5 text-[#1C2024]">
              Description
            </span>
            <div className="flex flex-row items-center gap-2 flex-wrap">
              {isOriginal ? (
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
              )}
            </div>
          </div>
          <div className="flex flex-row items-center py-2 px-0 w-full rounded">
            <div className="w-full font-inter font-normal text-sm leading-[150%] text-[#080705]">
              {isOriginal ? (
                targetRequirement.description
              ) : (
                <WordDiff
                  oldText={targetRequirement.description}
                  newText={mergedData.description}
                />
              )}
            </div>
          </div>
        </div>

        <hr className="w-full border-[#E6E6E6]" />

        {/* Implementation field */}
        <div className="flex flex-col items-start p-0 gap-1 flex-none order-1 self-stretch flex-grow-0">
          <div className="flex flex-row items-center gap-2 w-full">
            <span className="font-inter font-bold text-base leading-5 text-[#1C2024]">
              Implementation
            </span>
            <Badge
              className={`px-1.5 py-0.5 text-xs font-medium rounded-[3px] ${
                !isOriginal && statusChanged
                  ? "bg-[#A2CFCA] text-[#080705]"
                  : "bg-[#A2CFCA] text-[#080705]"
              }`}
            >
              {displayStatus}
            </Badge>
          </div>
          <div className="flex flex-row items-center py-2 px-0 w-full rounded">
            <div className="w-full font-inter font-normal text-sm leading-[150%] text-[#080705]">
              {isOriginal ? (
                targetRequirement.implementation_description
              ) : (
                <WordDiff
                  oldText={targetRequirement.implementation_description}
                  newText={mergedData.implementation_description}
                />
              )}
            </div>
          </div>
        </div>

        <hr className="w-full border-[#E6E6E6]" />

        {/* Requirement Verification field */}
        {(mergedData.requirement_verification ||
          targetRequirement.requirement_verification) && (
          <div className="flex flex-col items-start p-0 gap-1 flex-none order-2 self-stretch flex-grow-0">
            <span className="font-inter font-bold text-base leading-5 text-[#1C2024]">
              Verification
            </span>
            <div className="flex flex-row items-center py-2 px-0 w-full rounded">
              <div className={`w-full font-inter font-normal text-sm leading-[17px] ${isOriginal ? "text-[#080705]" : "line-through text-[rgba(8,7,5,0.5)]"}`}>
                {isOriginal ? (
                  targetRequirement.requirement_verification || ""
                ) : (
                  mergedData.requirement_verification || targetRequirement.requirement_verification || ""
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
