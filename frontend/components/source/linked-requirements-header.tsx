"use client";

import { Plus, Link, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/lib/utils/styles";

interface LinkedRequirementsHeaderProps {
  onCreateNewRequirement: () => void;
  onOpenLinkModal: () => void;
  onFetchSuggestedAction?: () => Promise<void>;
  isFetchingSuggestion?: boolean;
}

export function LinkedRequirementsHeader({
  onCreateNewRequirement,
  onOpenLinkModal,
  onFetchSuggestedAction,
  isFetchingSuggestion = false,
}: LinkedRequirementsHeaderProps) {
  return (
    <div className="flex flex-row items-center p-0 gap-2.5 h-7">
      <Badge className="flex flex-row justify-center items-center px-3 py-1.5 gap-1.5 h-7 bg-[#080705] dark:bg-[#080705] text-[#FAFFFD] dark:text-[#FAFFFD] rounded-[3px] font-inter font-medium text-sm leading-4 tracking-[0.04px]">
        Existing requirements
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCreateNewRequirement}
        className={buttonStyles.iconButton}
        title="Create new requirement from source"
        data-testid="create-new-requirement-button"
      >
        <Plus size={12} className="text-[#080705] dark:text-[#080705]" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenLinkModal}
        className={buttonStyles.iconButton}
        title="Link existing requirement"
        data-testid="add-link-button"
      >
        <Link size={12} className="text-[#080705] dark:text-[#080705]" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onFetchSuggestedAction}
        disabled={isFetchingSuggestion}
        className={`${buttonStyles.iconButton} disabled:opacity-50`}
        title="Get Rekwai suggestion"
        data-testid="refresh-requirements-button"
      >
        <RotateCcw
          size={12}
          className={`text-[#080705] dark:text-[#080705] ${isFetchingSuggestion ? "animate-[spin_1s_linear_infinite_reverse]" : ""}`}
        />
      </Button>
    </div>
  );
}
