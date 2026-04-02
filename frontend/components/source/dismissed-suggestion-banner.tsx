"use client";

import { useState } from "react";
import { RotateCcw, ArrowRight, Plus, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequirementCard } from "@/components/common/requirement-card";
import { TypeBadges, StatusBadge } from "@/components/common/requirement-badges";
import { RequirementItem } from "@/types/requirement-types";

interface DismissedSuggestionBannerProps {
  onRerun: () => Promise<void>;
  onAttachToRequirement: () => void;
  onAddRequirement: () => void;
  isRerunning?: boolean;
  extractedRequirement?: RequirementItem;
  onEditExtraction?: () => void;
}

export function DismissedSuggestionBanner({
  onRerun,
  onAttachToRequirement,
  onAddRequirement,
  isRerunning = false,
  extractedRequirement,
  onEditExtraction,
}: DismissedSuggestionBannerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const loading = isRerunning || isRunning;

  const handleRerun = async () => {
    setIsRunning(true);
    try {
      await onRerun();
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Dismissed header */}
      <div
        className="flex items-center justify-between"
        data-testid="dismissed-suggestion-banner"
      >
        <div className="flex items-center gap-2">
          <span className="font-inter font-semibold text-sm text-[#080705]">
            Suggestion
          </span>
          <Badge className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 border-gray-200 text-gray-600">
            Dismissed
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRerun}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-2 py-1 h-7 text-[#080705] hover:bg-[#E6E6E6]"
          data-testid="rerun-suggestion-button"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RotateCcw size={12} />
          )}
          Re-run
        </Button>
      </div>

      {/* Extracted requirement content */}
      {extractedRequirement && (
        <>
          <div className="flex items-center gap-2">
            <span className="font-inter font-semibold text-xs text-[#080705]">
              Extraction
            </span>
            {onEditExtraction && (
              <button
                type="button"
                onClick={onEditExtraction}
                className="flex items-center gap-1 font-inter text-xs text-muted-foreground hover:text-[#080705]"
                data-testid="edit-extraction-button"
              >
                Edit
                <Pencil size={10} />
              </button>
            )}
          </div>
          <RequirementCard
            description={
              extractedRequirement.text ||
              extractedRequirement.description ||
              ""
            }
            typeBadges={<TypeBadges types={extractedRequirement.types || []} />}
            statusBadge={<StatusBadge status={extractedRequirement.implementation || "To do"} />}
            implementationDescription={
              extractedRequirement.implementationDescription || ""
            }
            verificationDescription={
              extractedRequirement.requirementVerification || ""
            }
          />
        </>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onAttachToRequirement}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 h-8 rounded-md border-[#E6E6E6] text-[#080705] hover:bg-[#E6E6E6]"
          data-testid="dismissed-attach-button"
        >
          Attach to requirement
          <ArrowRight size={12} />
        </Button>
        <Button
          size="sm"
          onClick={onAddRequirement}
          className="flex items-center gap-1.5 bg-[#080705] text-white hover:bg-[#2a2a2a] text-xs px-3 py-1.5 h-8 rounded-md"
          data-testid="dismissed-add-requirement-button"
        >
          Add Requirement
          <Plus size={12} />
        </Button>
      </div>
    </div>
  );
}
