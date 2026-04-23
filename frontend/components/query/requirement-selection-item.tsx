import { Requirement } from "@/types/requirement-types";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { getRequirementBadgeClassName } from "@/lib/utils/question-modal";

interface RequirementSelectionItemProps {
  requirement: Requirement;
  isSelected: boolean;
  isAlreadyLinked: boolean;
  onToggle: () => void;
}

export function RequirementSelectionItem({
  requirement,
  isSelected,
  isAlreadyLinked,
  onToggle,
}: RequirementSelectionItemProps) {
  return (
    <div
      className={`flex flex-row items-start p-2 gap-2.5 w-full ${
        isSelected ? "bg-[#E6E6E6]" : ""
      }`}
      data-testid={`requirement-item-${requirement.id}`}
    >
      <div className="flex items-start pt-0.5">
        <Checkbox
          checked={isAlreadyLinked || isSelected}
          onCheckedChange={onToggle}
          disabled={isAlreadyLinked}
          className="w-3.5 h-3.5 flex-shrink-0"
        />
      </div>
      <div className="flex flex-col items-start p-0 gap-2 flex-1">
        <div className="font-inter font-normal text-xs leading-[15px] text-semantic-text">
          {requirement.requirement_key} - {requirement.description}
        </div>
        <div className="flex flex-row items-start p-0 gap-3">
          {requirement.types &&
            requirement.types.length > 0 &&
            requirement.types.map((type) => (
              <Badge
                key={type}
                className={getRequirementBadgeClassName("type")}
              >
                {type}
              </Badge>
            ))}
          {requirement.implementation_status && (
            <Badge className={getRequirementBadgeClassName("status")}>
              {requirement.implementation_status}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
