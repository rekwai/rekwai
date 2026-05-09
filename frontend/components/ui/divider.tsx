import { cn } from "@/lib/utils/cn";

interface DividerProps {
  className?: string;
}

/**
 * Reusable horizontal divider component
 */
export function Divider({ className }: DividerProps) {
  return (
    <div
      className={cn(
        "w-full h-px border-semantic-stroke border-t",
        className,
      )}
    />
  );
}
