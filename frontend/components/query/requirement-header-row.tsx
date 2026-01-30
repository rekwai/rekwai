import { Plus, Link, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/lib/utils/question-modal";

interface RequirementHeaderRowProps {
  onCreateRequirement?: () => void;
  onLinkRequirement: () => void;
  onRefreshSimilarRequirements?: () => Promise<void>;
  isSearchingSimilar?: boolean;
}

export function RequirementHeaderRow({
  onCreateRequirement,
  onLinkRequirement,
  onRefreshSimilarRequirements,
  isSearchingSimilar = false,
}: RequirementHeaderRowProps) {
  return (
    <div className="flex flex-row items-center p-0 gap-2.5 w-[216px] h-7 flex-none order-0 flex-grow-0">
      <Badge className="flex flex-row justify-center items-center px-3 py-1.5 gap-1.5 h-7 bg-[#080705] text-[#FAFFFD] rounded-[3px] font-inter font-medium text-sm leading-4 tracking-[0.04px] hover:bg-[#080705] dark:hover:bg-[#080705]">
        Requirement(s)
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCreateRequirement}
        className={buttonStyles.iconButton}
        title="Create requirement"
        data-testid="create-requirement-button"
      >
        <Plus size={12} className="text-foreground" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onLinkRequirement}
        className={buttonStyles.iconButton}
        title="Link existing requirement"
        data-testid="link-requirement-button"
      >
        <Link size={12} className="text-foreground" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefreshSimilarRequirements}
        disabled={isSearchingSimilar}
        className={`${buttonStyles.iconButton} disabled:opacity-50`}
        title="Refresh similar requirements"
        data-testid="refresh-requirements-button"
      >
        <RotateCcw
          size={12}
          className={`text-foreground ${isSearchingSimilar ? "animate-[spin_1s_linear_infinite_reverse]" : ""}`}
        />
      </Button>
    </div>
  );
}
