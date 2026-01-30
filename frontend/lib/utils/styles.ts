// Centralized reusable CSS styles for components

// Button styles for consistency across the application
export const buttonStyles = {
  primary:
    "flex items-center gap-1.5 px-2.5 py-1 text-xs font-normal bg-[#15786A] border-none rounded-[12px] text-white hover:bg-[#15786A]/90 hover:text-white disabled:opacity-50",
  secondary:
    "flex items-center gap-1.5 px-2.5 py-1 text-xs font-normal bg-[#00100B] border-none hover:bg-[#00100B]/90 rounded-[12px] text-white hover:text-white disabled:opacity-50",
  outline:
    "flex items-center gap-1.5 px-2.5 py-1 text-xs font-normal bg-[#F6F6F6] border border-[#E6E6E6] rounded-[12px] text-[#080705] hover:bg-[#E3DBDB]/90 disabled:opacity-50",
  ghost:
    "px-2.5 py-1 text-xs font-normal bg-[#F6F6F6] dark:bg-[#1a1a1a] text-[#080705] dark:text-[#FAFFFD] border-none hover:bg-gray-200 dark:hover:bg-[#312F2F]",
  iconButton:
    "flex flex-row justify-center items-center py-1 px-2.5 gap-1.5 w-8 h-7 bg-[#F6F6F6] dark:bg-[#F6F6F6] rounded-xl border-0",
  iconButtonWithBorder:
    "flex flex-row justify-center items-center py-1 px-2.5 gap-1 w-8 h-7 bg-[#FAFFFD] border border-[#080705] rounded-xl",
  iconButtonDestructive:
    "flex flex-row justify-center items-center py-1 px-2.5 gap-1 w-8 h-7 bg-[#FBDBDD] rounded-xl border-0",
} as const;

// Badge styles for various badge types
export const badgeStyles = {
  result:
    "bg-[#E1D9A1] text-[#080705] text-xs font-medium px-1.5 py-0.5 rounded-[3px]",
  action:
    "bg-[#E3DBDB] text-[#080705] text-xs font-medium px-1.5 py-0.5 rounded-[3px] cursor-pointer hover:bg-gray-200",
  typeBlue:
    "bg-[rgba(0,71,241,0.07)] text-[rgba(0,43,183,0.77)] text-xs px-1.5 py-0.5",
  typeGray: "bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5",
  similarity: "text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded",
  destructive: "cursor-help",
} as const;

// Badge color styles for requirement type and status badges
const BADGE_COLORS = {
  type: {
    bg: "bg-[#FFC7B0]",
    text: "text-[#A54148]",
  },
  status: {
    bg: "bg-[#E1D9A1]",
    text: "text-[#080705]",
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
    "w-full min-h-[80px] px-4 py-3 text-sm leading-[1.5] text-[#080705] dark:text-[#FAFFFD] bg-white/90 dark:bg-[#1a1a1a] border border-[rgba(0,9,50,0.12)] dark:border-[#1a1a1a] rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
  dropdown:
    "flex items-center justify-between w-full px-3 py-2 text-sm text-[#080705] bg-white/90 border border-[rgba(0,9,50,0.12)] rounded-md cursor-pointer hover:bg-white",
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
