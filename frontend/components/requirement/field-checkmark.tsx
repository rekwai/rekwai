import { Check } from "lucide-react";

interface FieldCheckmarkProps {
  show: boolean;
}

/**
 * Displays a green checkmark indicator in the top-right corner of a field
 * Used to provide visual feedback when a field has a value
 */
export function FieldCheckmark({ show }: FieldCheckmarkProps) {
  if (!show) return null;

  return (
    <div className="absolute right-3 top-3 text-green-600">
      <Check size={16} />
    </div>
  );
}
