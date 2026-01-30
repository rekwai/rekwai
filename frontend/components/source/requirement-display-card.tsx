"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequirementItem } from "@/types/requirement-types";
import { buttonStyles } from "@/lib/utils/styles";
import { RequirementCard } from "@/components/common/requirement-card";

interface RequirementDisplayCardProps {
  requirement: RequirementItem;
  onEdit: () => void;
}

export function RequirementDisplayCard({
  requirement,
  onEdit,
}: RequirementDisplayCardProps) {
  const requirementText = requirement.text || requirement.description || "";
  const types = requirement.types || [];
  const implementationStatus = requirement.implementation || "To do";
  const implementationDescription = requirement.implementationDescription || "";
  const requirementVerification = requirement.requirementVerification || "";

  return (
    <div
      className="flex flex-col items-start p-0 gap-2 w-full max-w-[672px]"
      data-testid="requirement-display-card"
    >
      {/* Header with badge and edit button */}
      <div className="flex flex-row items-center p-0 gap-2.5">
        <Badge className="flex flex-row justify-center items-center px-3 py-1.5 gap-1.5 bg-[#080705] dark:bg-[#080705] text-[#FAFFFD] dark:text-[#FAFFFD] rounded-[3px] font-inter font-medium text-sm leading-4 tracking-[0.04px]">
          Requirement from Source
        </Badge>

        {/* Edit Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className={buttonStyles.iconButton}
          data-testid="edit-requirement-button"
        >
          <Pencil size={12} className="text-[#080705] dark:text-[#080705]" />
        </Button>
      </div>

      {/* Card */}
      <RequirementCard
        description={requirementText}
        types={types}
        implementationStatus={implementationStatus}
        implementationDescription={implementationDescription}
        verificationDescription={requirementVerification}
      />
    </div>
  );
}
