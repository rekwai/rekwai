"use client";

import { useState } from "react";
import { Undo2, ExternalLink, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RequirementCard } from "@/components/common/requirement-card";
import { TypeBadges, StatusBadge } from "@/components/common/requirement-badges";
import { Requirement } from "@/types/requirement-types";

interface MergeStatusBannerProps {
  targetRequirementKey: string;
  mergedRequirement?: Requirement;
  onUndo: () => Promise<void>;
  onEdit?: (requirement: Requirement) => void;
}

export function MergeStatusBanner({
  targetRequirementKey,
  mergedRequirement,
  onUndo,
  onEdit,
}: MergeStatusBannerProps) {
  const [isUndoing, setIsUndoing] = useState(false);

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      await onUndo();
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3" data-testid="merge-status-banner">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-inter font-semibold text-sm text-semantic-text">
            Status
          </span>
          <Badge
            variant="chip"
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-green-50 border-green-200 text-green-700"
          >
            <ExternalLink size={10} />
            Merged
          </Badge>
        </div>
        <button
          type="button"
          onClick={handleUndo}
          disabled={isUndoing}
          className="flex items-center gap-1 font-inter text-xs font-medium text-semantic-text hover:underline disabled:opacity-50"
          data-testid="undo-merge-button"
        >
          {isUndoing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Undo2 size={12} />
          )}
          Undo
        </button>
      </div>

      {/* Merged requirement content */}
      {mergedRequirement && (
        <>
          <div className="flex items-center gap-2">
            <span className="font-inter font-semibold text-xs text-semantic-text">
              {targetRequirementKey}
            </span>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(mergedRequirement)}
                className="flex items-center gap-1 font-inter text-xs text-muted-foreground hover:text-semantic-text"
                data-testid="edit-merged-requirement-button"
              >
                Edit
                <Pencil size={10} />
              </button>
            )}
          </div>
          <RequirementCard
            description={mergedRequirement.description}
            typeBadges={<TypeBadges types={mergedRequirement.types} />}
            statusBadge={<StatusBadge status={mergedRequirement.implementation_status} />}
            implementationDescription={
              mergedRequirement.implementation_description
            }
            verificationDescription={
              mergedRequirement.requirement_verification || ""
            }
          />
        </>
      )}
    </div>
  );
}
