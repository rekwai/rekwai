import { RequirementHistory } from "@/types/requirement-types";
import { FieldDiff } from "./field-diff";

const BADGE_CONFIG = {
  CREATE: {
    label: "Created",
    className:
      "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400",
  },
  UPDATE: {
    label: "Updated",
    className:
      "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400",
  },
  DELETE: {
    label: "Deleted",
    className: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400",
  },
  LINK_FROM_EXTRACTION: {
    label: "Linked from extraction",
    className:
      "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400",
  },
  MERGE_FROM_EXTRACTION: {
    label: "Merged from extraction",
    className:
      "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400",
  },
  CREATE_FROM_EXTRACTION: {
    label: "Created from extraction",
    className:
      "bg-teal-100 dark:bg-teal-900/20 text-teal-800 dark:text-teal-400",
  },
} as const;

function ChangeTypeBadge({
  changeType,
}: {
  changeType: keyof typeof BADGE_CONFIG;
}) {
  const config = BADGE_CONFIG[changeType];
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

interface RequirementHistoryDisplayProps {
  historyEntries: RequirementHistory[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Displays the change history for a requirement
 * Shows creation, updates, and deletions with before/after diffs
 */
export function RequirementHistoryDisplay({
  historyEntries,
  isLoading,
  error,
}: RequirementHistoryDisplayProps) {
  if (isLoading) {
    return (
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium">History</h3>
        <div className="text-sm text-gray-500 dark:text-[#FAFFFD]">
          Loading history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium">History</h3>
        <div className="text-sm text-red-500 dark:text-red-400">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-medium">History</h3>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {historyEntries.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-[#FAFFFD]">
            No history available.
          </div>
        ) : (
          historyEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col border-b pb-2 last:border-b-0"
            >
              <div className="flex justify-between items-center mb-1">
                <div>
                  <ChangeTypeBadge changeType={entry.change_type} />
                </div>
                <div className="text-xs text-gray-500 dark:text-[#FAFFFD] whitespace-nowrap">
                  {new Date(entry.change_timestamp).toLocaleString()}
                </div>
              </div>
              {entry.change_type === "UPDATE" && (
                <div className="text-xs text-gray-600 dark:text-[#FAFFFD] text-left mt-1">
                  <FieldDiff
                    label="Description"
                    previousValue={entry.previous_description}
                    newValue={entry.new_description}
                  />
                  <FieldDiff
                    label="Types"
                    previousValue={entry.previous_types}
                    newValue={entry.new_types}
                  />
                  <FieldDiff
                    label="Implementation"
                    previousValue={entry.previous_implementation_description}
                    newValue={entry.new_implementation_description}
                  />
                  <FieldDiff
                    label="Status"
                    previousValue={entry.previous_implementation_status}
                    newValue={entry.new_implementation_status}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
