/**
 * Helper function to handle async operations with loading state tracking.
 * Follows DRY principle by extracting common pattern: add to set → async operation → remove from set.
 *
 * @param id - The identifier for the loading item
 * @param setLoadingIds - State setter for the Set of loading IDs
 * @param operation - The async operation to perform
 * @returns The result of the operation
 */
export const withLoadingState = async <T>(
  id: string,
  setLoadingIds: React.Dispatch<React.SetStateAction<Set<string>>>,
  operation: () => Promise<T>,
): Promise<T> => {
  setLoadingIds((prev) => new Set(prev).add(id));
  try {
    return await operation();
  } finally {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }
};
