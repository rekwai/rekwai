"use client";

import { useState, useEffect } from "react";
import { getDistinctRequirementTypes } from "@/lib/api/requirements";

/**
 * Hook to fetch and manage available requirement types
 * Fetches types when `shouldFetch` is true (typically when modal opens)
 */
export function useRequirementTypes(shouldFetch: boolean) {
  const [types, setTypes] = useState<string[]>([]);

  useEffect(() => {
    if (!shouldFetch) {
      setTypes([]);
      return;
    }

    let cancelled = false;

    const fetchTypes = async () => {
      try {
        const fetchedTypes = await getDistinctRequirementTypes();
        if (!cancelled) {
          setTypes(fetchedTypes);
        }
      } catch (err) {
        console.error("Failed to fetch existing requirement types:", err);
        if (!cancelled) {
          setTypes([]);
        }
      }
    };

    fetchTypes();

    return () => {
      cancelled = true;
    };
  }, [shouldFetch]);

  return { types };
}
