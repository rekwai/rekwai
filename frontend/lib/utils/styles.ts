// Centralized reusable CSS styles for components

// Button styles for consistency across the application
export const buttonStyles = {
  primary:
    "flex items-center gap-1.5 px-2.5 py-1 text-xs font-normal bg-semantic-success-fg border-none rounded-[4px] text-semantic-white transition-colors hover:bg-[color-mix(in_srgb,var(--semantic-success-fg)_90%,transparent)] hover:text-semantic-white disabled:opacity-50",
  secondary:
    "flex items-center gap-1.5 px-2.5 py-1 text-xs font-normal bg-semantic-emphasis border-none hover:bg-semantic-black rounded-[4px] text-semantic-white hover:text-semantic-white disabled:opacity-50",
  outline:
    "flex items-center gap-1.5 px-2.5 py-1 text-xs font-normal bg-semantic-bg-elevation-1 border border-semantic-stroke rounded-[4px] text-semantic-text hover:bg-semantic-highlight disabled:opacity-50",
  ghost:
    "px-2.5 py-1 text-xs font-normal bg-semantic-bg-elevation-1 text-semantic-text border-none hover:bg-semantic-highlight",
  iconButton:
    "flex flex-row justify-center items-center py-1 px-2.5 gap-1.5 w-8 h-7 bg-semantic-bg-elevation-1 rounded-[4px] border-0",
  iconButtonWithBorder:
    "flex flex-row justify-center items-center py-1 px-2.5 gap-1 w-8 h-7 bg-semantic-bg-elevation-2 border border-semantic-emphasis rounded-[4px]",
  iconButtonDestructive:
    "flex flex-row justify-center items-center py-1 px-2.5 gap-1 w-8 h-7 bg-semantic-error-bg rounded-[4px] border-0",
} as const;

// Badge styles for various badge types
export const badgeStyles = {
  result:
    "bg-semantic-indicator-7 text-semantic-text text-xs font-medium px-1.5 py-0.5 rounded-[3px]",
  action:
    "bg-semantic-highlight text-semantic-text text-xs font-medium px-1.5 py-0.5 rounded-[3px] cursor-pointer hover:bg-semantic-stroke",
  typeBlue: "bg-type-chip-bg text-type-chip-text text-xs px-1.5 py-0.5",
  typeGray: "bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5",
  similarity: "text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded",
  destructive: "cursor-help",
} as const;

// Badge color styles for requirement type and status badges
const BADGE_COLORS = {
  type: {
    bg: "bg-primitive-orange-200",
    text: "text-semantic-error-fg",
  },
  status: {
    bg: "bg-semantic-indicator-7",
    text: "text-semantic-text",
  },
} as const;

// Base badge className for requirement badges
const REQUIREMENT_BADGE_BASE =
  "flex flex-row justify-center items-center px-1.5 py-0.5 gap-1.5 h-5 rounded-[3px] font-inter font-medium text-xs leading-4 tracking-[0.04px]";

// Helper to get badge className for requirement type or status
export const getRequirementBadgeClassName = (
  variant: "type" | "status",
): string => {
  const colors = BADGE_COLORS[variant];
  return `${REQUIREMENT_BADGE_BASE} ${colors.bg} ${colors.text}`;
};

// Input styles
export const inputStyles = {
  textarea:
    "w-full min-h-[80px] px-4 py-3 text-sm leading-[1.5] text-semantic-text bg-semantic-bg-elevation-2 border border-semantic-stroke rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-semantic-focus focus:border-transparent",
  dropdown:
    "flex items-center justify-between w-full px-3 py-2 text-sm text-semantic-text bg-semantic-bg-elevation-2 border border-semantic-stroke rounded-md cursor-pointer hover:bg-semantic-white",
} as const;

// Shadow styles
export const shadowStyles = {
  inset:
    "inset 0px 1.5px 2px 0px rgba(0, 0, 85, 0.02), inset 0px 1.5px 2px 0px rgba(0, 0, 0, 0.1)",
} as const;

// Get status badge styles based on implementation status
export const getStatusBadgeStyles = (status: string | undefined): string => {
  const statusMap: Record<string, string> = {
    Implemented: "bg-green-100 text-green-800",
    Planned: "bg-blue-100 text-blue-800",
    "Won't do": "bg-gray-100 text-gray-800",
  };

  return statusMap[status || ""] || "bg-yellow-100 text-yellow-800";
};
