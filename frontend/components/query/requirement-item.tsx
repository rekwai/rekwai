import { Pencil, X, Loader2, Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Requirement } from "@/types/requirement-types";
import { buttonStyles } from "@/lib/utils/question-modal";
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
      showVerification={false}
      header={
        <div className="flex flex-row items-center p-0 gap-1.5 h-5 flex-none order-0 flex-grow">
          <span className="font-inter font-semibold text-xs leading-5 text-semantic-text flex-none order-0">
            {requirement.requirement_key}
          </span>
        </div>
      }
      actions={
        <>
          {/* Edit Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(requirement)}
            className={`${buttonStyles.iconButtonWithBorder} flex-none order-1`}
            data-testid="edit-requirement-button"
          >
            <Pencil size={12} className="text-semantic-text" />
          </Button>
          {/* Merge Button */}
          {onMerge && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMerge(requirement)}
              disabled={isMerging}
              className={`${buttonStyles.iconButtonWithBorder} flex-none order-2 disabled:opacity-50`}
              data-testid="merge-requirement-button"
              title="Merge this requirement"
            >
              {isMerging ? (
                <Loader2 size={12} className="animate-spin text-semantic-text" />
              ) : (
                <Merge size={12} className="text-semantic-text" />
              )}
            </Button>
          )}
          {/* Ignore Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onIgnore(requirement)}
            disabled={isToggling}
            className={`${buttonStyles.iconButtonDestructive} flex-none order-3 disabled:opacity-50`}
            data-testid="ignore-requirement-button"
            title="Ignore this requirement"
          >
            {isToggling ? (
              <Loader2 size={12} className="animate-spin text-semantic-text" />
            ) : (
              <X size={12} className="text-semantic-text" />
            )}
          </Button>
        </>
      }
    />
  );
}
