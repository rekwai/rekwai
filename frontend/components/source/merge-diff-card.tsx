"use client";

import { ReactNode } from "react";
import { diffWords } from "diff";
import { Badge } from "@/components/ui/badge";
import { getStatusBadgeStyles } from "@/lib/utils/question-modal";
import { MergedRequirement, Requirement } from "@/types/requirement-types";

interface MergeDiffCardProps {
  mergedData: MergedRequirement;
  targetRequirement: Requirement;
  header?: ReactNode;
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
          return null; // Don't show removed text - we're showing the new version
        }
        if (part.added) {
          return (
            <span
              key={i}
              className="bg-green-100 text-green-800 rounded px-0.5"
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

export function MergeDiffCard({
  mergedData,
  targetRequirement,
  header,
}: MergeDiffCardProps) {
  const existingTypes = new Set(targetRequirement.types);
  const newTypes = mergedData.types.filter((t) => !existingTypes.has(t));
  const unchangedTypes = mergedData.types.filter((t) => existingTypes.has(t));

  const statusChanged =
    mergedData.implementation_status !==
    targetRequirement.implementation_status;

  return (
    <div
      className="flex flex-col items-start p-0 border border-[#E6E6E6] rounded-lg flex-none self-stretch flex-grow-0 bg-white"
      data-testid="merge-diff-card"
    >
      {/* Header (if provided) */}
      {header && (
        <div className="flex flex-row items-center p-0 gap-2 h-11 border-b border-[#E6E6E6] flex-none order-0 self-stretch">
          <div className="flex flex-row items-center p-2 gap-2 h-11 bg-[#F6F6F6] flex-none order-0 flex-grow">
            {header}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col items-start p-4 gap-2 flex-none order-1 self-stretch flex-grow-0 w-full">
        {/* Description field */}
        <div className="flex flex-col items-start p-0 gap-1 flex-none order-0 self-stretch flex-grow-0">
          <div className="flex flex-row items-center gap-2 w-full flex-wrap">
            <span className="font-inter font-semibold text-sm leading-5 text-[#1C2024]">
              Description
            </span>
            <div className="flex flex-row items-center gap-2 flex-wrap">
              {unchangedTypes.map((type, index) => (
                <Badge
                  key={index}
                  className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1.5 h-5 bg-[rgba(0,71,241,0.07)] rounded-[3px] font-inter font-medium text-xs leading-4 tracking-[0.04px] text-[rgba(0,43,183,0.77)]"
                >
                  {type}
                </Badge>
              ))}
              {newTypes.map((type, index) => (
                <Badge
                  key={`new-${index}`}
                  className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1.5 h-5 bg-green-100 rounded-[3px] font-inter font-medium text-xs leading-4 tracking-[0.04px] text-green-800"
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-row items-center py-2 px-0 w-full rounded">
            <div className="w-full font-inter font-normal text-sm leading-[150%] text-[#080705]">
              <WordDiff
                oldText={targetRequirement.description}
                newText={mergedData.description}
              />
            </div>
          </div>
        </div>

        {/* Implementation field */}
        <div className="flex flex-col items-start p-0 gap-1 flex-none order-1 self-stretch flex-grow-0">
          <div className="flex flex-row items-center gap-2 w-full">
            <span className="font-inter font-semibold text-sm leading-5 text-[#1C2024]">
              Implementation
            </span>
            <Badge
              className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                statusChanged
                  ? "bg-green-100 text-green-800"
                  : getStatusBadgeStyles(mergedData.implementation_status)
              }`}
            >
              {mergedData.implementation_status}
            </Badge>
          </div>
          <div className="flex flex-row items-center py-2 px-0 w-full rounded">
            <div className="w-full font-inter font-normal text-sm leading-[150%] text-[#080705]">
              <WordDiff
                oldText={targetRequirement.implementation_description}
                newText={mergedData.implementation_description}
              />
            </div>
          </div>
        </div>

        {/* Requirement Verification field */}
        {(mergedData.requirement_verification ||
          targetRequirement.requirement_verification) && (
          <div className="flex flex-col items-start p-0 gap-1 flex-none order-2 self-stretch flex-grow-0">
            <span className="font-inter font-semibold text-sm leading-5 text-[#1C2024]">
              Requirement Verification
            </span>
            <div className="flex flex-row items-center py-2 px-0 w-full rounded">
              <div className="w-full font-inter font-normal text-sm leading-[150%] text-[#080705]">
                <WordDiff
                  oldText={targetRequirement.requirement_verification || ""}
                  newText={mergedData.requirement_verification || ""}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
