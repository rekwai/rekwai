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
        "w-full h-px border-[#E6E6E6] dark:border-[#1a1a1a] border-t",
        className,
      )}
    />
  );
}
