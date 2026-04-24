import { Check } from "lucide-react";

interface FieldCheckmarkProps {
  show: boolean;
}

/** Top-right completion hint; use with `Textarea` `withFieldCheckmarkGutter` in a `relative` wrapper. */
export function FieldCheckmark({ show }: FieldCheckmarkProps) {
  if (!show) return null;

  return (
    <div className="absolute right-3 top-3 text-green-600">
      <Check size={16} />
    </div>
  );
}
