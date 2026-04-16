import { Badge } from "@/components/ui/badge";
import { getStatusBadgeStyles } from "@/lib/utils/question-modal";

const TYPE_BADGE_CLASS =
  "flex flex-row justify-center items-center px-1.5 py-0.5 gap-1.5 h-5 bg-type-chip-bg text-type-chip-text rounded-[3px] font-inter font-medium text-xs leading-4 tracking-[0.04px]";

export function TypeBadges({ types }: { types: string[] }) {
  return types.map((type, index) => (
    <Badge key={index} className={TYPE_BADGE_CLASS}>
      {type}
    </Badge>
  ));
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={`px-1.5 py-0.5 text-xs font-medium rounded ${getStatusBadgeStyles(status)}`}
    >
      {status}
    </Badge>
  );
}
