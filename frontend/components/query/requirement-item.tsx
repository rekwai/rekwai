import { Pencil, X, Loader2, Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Requirement } from "@/types/requirement-types";
import { RequirementCard } from "@/components/common/requirement-card";
import { TypeBadges, StatusBadge } from "@/components/common/requirement-badges";

interface RequirementItemProps {
  requirement: Requirement;
  isToggling: boolean;
  onEdit: (requirement: Requirement) => void;
  onIgnore: (requirement: Requirement) => void;
  onMerge?: (requirement: Requirement) => void;
  isMerging?: boolean;
}

export function RequirementItem({
  requirement,
  isToggling,
  onEdit,
  onIgnore,
  onMerge,
  isMerging = false,
}: RequirementItemProps) {
  return (
    <RequirementCard
      description={requirement.description}
      typeBadges={<TypeBadges types={requirement.types} />}
      statusBadge={<StatusBadge status={requirement.implementation_status} />}
      implementationDescription={requirement.implementation_description}
      pinFooterToBottom
      showVerification={false}
      title={
        <span className="font-inter text-xs font-semibold leading-5 text-semantic-text">
          {requirement.requirement_key}
        </span>
      }
      footer={
        <div className="flex items-center justify-end gap-1 overflow-clip rounded-[4px]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(requirement)}
            className="h-7 pl-2.5 pr-2 py-1 rounded-[4px] border border-semantic-stroke bg-semantic-bg-elevation-1 text-xs font-normal text-semantic-text hover:bg-semantic-highlight shadow-none"
            data-testid="edit-requirement-button"
          >
            Edit
            <Pencil size={14} />
          </Button>

          {onMerge && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMerge(requirement)}
              disabled={isMerging}
              className="h-7 pl-2.5 pr-2 py-1 rounded-[4px] border border-semantic-stroke bg-semantic-bg-elevation-1 text-xs font-normal text-semantic-text hover:bg-semantic-highlight disabled:opacity-50 shadow-none"
              data-testid="merge-requirement-button"
              title="Merge this requirement"
            >
              {isMerging ? (
                <Loader2
                  size={12}
                  className="animate-spin text-semantic-text"
                />
              ) : (
                <Merge size={14} className="text-semantic-text" />
              )}
              Merge
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onIgnore(requirement)}
            disabled={isToggling}
            className="group h-7 pl-2.5 pr-2 py-1 rounded-[4px] bg-semantic-error-bg text-xs font-normal text-semantic-black hover:!bg-semantic-error-fg dark:hover:!bg-semantic-error-fg hover:!text-semantic-white dark:hover:!text-semantic-white disabled:opacity-50 border-none shadow-none"
            data-testid="ignore-requirement-button"
            title="Ignore this requirement"
          >
            Remove
            {isToggling ? (
              <Loader2
                size={14}
                className="animate-spin text-semantic-black group-hover:text-semantic-white"
              />
            ) : (
              <X
                size={14}
                className="text-semantic-black group-hover:text-semantic-white"
              />
            )}
          </Button>
        </div>
      }
    />
  );
}
