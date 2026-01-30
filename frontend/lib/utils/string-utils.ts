/**
 * Utility to get first non-empty value from a list of potential values.
 * Follows DRY principle by extracting common pattern used across components.
 *
 * @param values - List of potential string values (can be string, undefined, or null)
 * @returns First non-empty string, or empty string if all values are empty/null/undefined
 */
export const getFirstNonEmpty = (
  ...values: (string | undefined | null)[]
): string => {
  return values.find((v) => v && v.trim() !== "") || "";
};
