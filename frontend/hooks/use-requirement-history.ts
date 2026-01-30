"use client";

import { useState, useEffect } from "react";
import { getRequirementHistory } from "@/lib/api/requirements";
import { RequirementHistory } from "@/types/requirement-types";

/**
 * Hook to fetch and manage requirement history
 * Fetches history when `requirementId` is provided and `shouldFetch` is true
 */
export function useRequirementHistory(
  requirementId: string | null | undefined,
  shouldFetch: boolean,
) {
  const [historyEntries, setHistoryEntries] = useState<RequirementHistory[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldFetch || !requirementId) {
      // Reset when not fetching
      setHistoryEntries([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const history = await getRequirementHistory(requirementId);
        if (!cancelled) {
          setHistoryEntries(history);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch requirement history:", err);
          setError(
            err instanceof Error ? err.message : "Failed to load history",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [requirementId, shouldFetch]);

  return { historyEntries, isLoading, error };
}
