"use client";

import { ReactNode } from "react";
import { Pencil } from "lucide-react";

interface PreviewCardProps {
  title?: string;
  onEdit?: () => void;
  editTestId?: string;
  testId?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function PreviewCard({
  title = "Preview",
  onEdit,
  editTestId,
  testId,
  headerRight,
  children,
}: PreviewCardProps) {
  return (
    <div className="flex flex-col items-start p-0 border border-[#E6E6E6] rounded-lg flex-none self-stretch flex-grow-0 bg-[#F6F6F6]" data-testid={testId}>
      <div className="flex items-center justify-between px-3 w-full h-[52px] bg-white border-b border-[#E6E6E6] rounded-t-lg">
        <div className="flex items-center gap-4">
          <span className="font-inter font-semibold text-base text-[#080705]">
            {title}
          </span>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1 font-inter text-xs bg-[#F6F6F6] px-2.5 py-1 h-7 rounded-[12px] text-[#080705] hover:bg-[#E6E6E6]"
              data-testid={editTestId}
            >
              Edit
              <Pencil size={12} />
            </button>
          )}
        </div>
        {headerRight}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
