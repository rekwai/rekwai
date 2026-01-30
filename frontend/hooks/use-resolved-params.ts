import { useState, useEffect } from "react";

/**
 * Hook to resolve async route params in Next.js 15+
 * Extracts the productKey from Promise-based params
 */
export function useResolvedParams<T extends Record<string, string>>(
  params: Promise<T>,
): T | null {
  const [resolvedParams, setResolvedParams] = useState<T | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  return resolvedParams;
}
