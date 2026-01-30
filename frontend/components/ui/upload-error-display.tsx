"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import type { TranslatedError } from "@/lib/utils/error-translator";

interface UploadErrorDisplayProps {
  error: TranslatedError;
  className?: string;
}

/**
 * Displays a user-friendly error message with expandable technical details
 * and actionable suggestions.
 */
export function UploadErrorDisplay({
  error,
  className = "",
}: UploadErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={`rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 ${className}`}
    >
      {/* Friendly message */}
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-3">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {error.friendlyMessage}
          </p>

          {/* Suggestions */}
          {error.suggestions.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-300">
                <Lightbulb className="h-3.5 w-3.5" />
                <span>Suggestions</span>
              </div>
              <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-0.5 pl-1">
                {error.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Expandable technical details */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
          >
            {showDetails ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <span>
              {showDetails ? "Hide details" : "Show technical details"}
            </span>
          </button>

          {showDetails && (
            <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-xs text-red-800 dark:text-red-200 font-mono break-all">
              {error.technicalDetails}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
