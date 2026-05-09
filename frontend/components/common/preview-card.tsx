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
    <div className="flex flex-col items-start p-0 border border-semantic-stroke rounded-lg flex-none self-stretch flex-grow-0 bg-semantic-bg-elevation-1" data-testid={testId}>
      <div className="flex items-center justify-between px-3 w-full h-[52px] bg-semantic-bg-elevation-2 border-b border-semantic-stroke rounded-t-lg">
        <div className="flex items-center gap-4">
          <span className="font-inter font-semibold text-base text-semantic-text">
            {title}
          </span>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1 font-inter text-xs bg-semantic-bg-elevation-1 px-2.5 py-1 h-7 rounded-[12px] text-semantic-text hover:bg-semantic-highlight"
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
