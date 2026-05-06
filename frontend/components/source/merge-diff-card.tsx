"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function MergeViewTabs({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <Tabs
      value={viewMode}
      onValueChange={(value) => {
        if (value === "suggestion" || value === "original") {
          onViewModeChange(value);
        }
      }}
    >
      <TabsList
        className="inline-flex h-8 items-center justify-center gap-0 rounded-[6px] bg-muted p-[2px] text-muted-foreground"
        data-testid="merge-view-toggle"
      >
        <TabsTrigger
          value="suggestion"
          className="h-full rounded-[4px] px-3 py-1 font-inter text-xs font-normal data-[state=active]:border data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
        >
          Suggestion
        </TabsTrigger>
        <TabsTrigger
          value="original"
          className="h-full rounded-[4px] px-3 py-1 font-inter text-xs font-normal data-[state=active]:border data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
        >
          Original
        </TabsTrigger>
      </TabsList>
    </Tabs>
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

  const originalVerificationText =
    targetRequirement.requirement_verification || "";
  const mergedVerificationText = mergedData.requirement_verification;
  const verificationText = isOriginal
    ? originalVerificationText
    : mergedVerificationText;

  return (
    <PreviewCard
      testId="merge-diff-card"
      onEdit={onEdit}
      editTestId="edit-merge-preview-button"
      headerRight={
        <MergeViewTabs viewMode={viewMode} onViewModeChange={setViewMode} />
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
              <WordDiff
                oldText={originalVerificationText}
                newText={mergedVerificationText}
              />
            )
          ) : undefined
        }
      />
    </PreviewCard>
  );
}
