interface FieldDiffProps {
  label: string;
  previousValue: string | string[] | null | undefined;
  newValue: string | string[] | null | undefined;
}

/**
 * Displays a before/after diff for a field in the requirement history
 * Shows the previous value in red and the new value in green
 */
export function FieldDiff({ label, previousValue, newValue }: FieldDiffProps) {
  // Don't render if values are the same
  if (previousValue === newValue) return null;

  // Handle array comparison (for types field)
  if (Array.isArray(previousValue) && Array.isArray(newValue)) {
    if (JSON.stringify(previousValue) === JSON.stringify(newValue)) {
      return null;
    }
  }

  // Format values for display
  const formatValue = (value: string | string[] | null | undefined): string => {
    if (value === null || value === undefined) return "None";
    if (Array.isArray(value)) return value.join(", ") || "None";
    return value;
  };

  return (
    <div className="mt-1 flex">
      <span className="font-medium mr-2 w-28 inline-block text-black dark:text-[#FAFFFD]">
        {label}:
      </span>
      <div className="text-xs italic flex flex-col">
        <div className="line-clamp-1 text-red-500 dark:text-red-400">
          - {formatValue(previousValue)}
        </div>
        <div className="line-clamp-1 text-green-500 dark:text-green-400">
          + {formatValue(newValue)}
        </div>
      </div>
    </div>
  );
}
