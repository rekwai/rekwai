import { format } from "date-fns";

/**
 * Formats a date string or Date object to a consistent format across the application
 * @param date - The date to format (string, Date object, undefined, or null)
 * @param includeTime - Whether to include time in the format (default: false)
 * @returns Formatted date string or "N/A" if date is undefined/null
 */
export function formatDate(
  date: string | Date | undefined | null,
  includeTime: boolean = false,
): string {
  if (!date) return "N/A";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (includeTime) {
      // Format: "Jan 15, 2024 14:30"
      return format(dateObj, "MMM d, yyyy HH:mm");
    }

    // Format: "Jan 15, 2024"
    return format(dateObj, "MMM d, yyyy");
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Invalid Date";
  }
}
