"use client";

import { useState } from "react";
import { Undo2, ExternalLink, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RequirementCard } from "@/components/common/requirement-card";
import { TypeBadges, StatusBadge } from "@/components/common/requirement-badges";
import { Requirement } from "@/types/requirement-types";

interface CreateStatusBannerProps {
  createdRequirement: Requirement;
  isLinked: boolean;
  onUndo: () => Promise<void>;
  onEdit?: (requirement: Requirement) => void;
}

export function CreateStatusBanner({
  createdRequirement,
  isLinked,
  onUndo,
  onEdit,
}: CreateStatusBannerProps) {
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
    <div className="flex flex-col gap-3" data-testid="create-status-banner">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-inter font-semibold text-sm text-semantic-text">
            Suggestion
          </span>
          <Badge
            variant="chip"
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-semantic-success-bg text-semantic-text"
          >
            <ExternalLink size={10} />
            Created
          </Badge>
        </div>
      </div>

      <p className="font-inter text-sm font-medium leading-6 text-semantic-text">
        {isLinked
          ? "A new requirement has been created from this extraction and linked."
          : "A new requirement was created, but linking failed. You can still edit it or undo creation."}
      </p>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleUndo}
          disabled={isUndoing}
          className="h-7 rounded-[12px] bg-semantic-bg-elevation-1 px-2.5 py-1 text-xs text-semantic-text hover:bg-semantic-highlight"
          data-testid="undo-create-requirement-button"
        >
          {isUndoing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Undo2 size={12} />
          )}
          Undo
        </Button>
        {onEdit && (
          <Button
            type="button"
            size="sm"
            onClick={() => onEdit(createdRequirement)}
            className="h-7 rounded-[12px] bg-custom-yellow px-2.5 py-1 text-xs text-semantic-text hover:bg-custom-yellow/90"
            data-testid="edit-created-requirement-button"
          >
            Edit Requirement
            <Pencil size={12} />
          </Button>
        )}
      </div>

      <RequirementCard
        title={
          <span className="font-inter text-xs font-semibold leading-5 text-semantic-text">
            {createdRequirement.requirement_key}
          </span>
        }
        description={createdRequirement.description}
        typeBadges={<TypeBadges types={createdRequirement.types} />}
        statusBadge={
          <StatusBadge status={createdRequirement.implementation_status} />
        }
        implementationDescription={createdRequirement.implementation_description}
        verificationDescription={createdRequirement.requirement_verification || ""}
      />
    </div>
  );
}
