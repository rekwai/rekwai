"use client";

import { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationFooterProps {
  itemCount: number;
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  onNext?: () => void;
  nextButtonLabel?: string;
  moreActions?: ReactNode;
}

export function NavigationFooter({
  itemCount,
  selectedIndex,
  onIndexChange,
  onNext,
  nextButtonLabel = "Save & Next",
  moreActions,
}: NavigationFooterProps) {
  const handlePrevious = () => {
    if (selectedIndex > 0) {
      onIndexChange(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else if (selectedIndex < itemCount - 1) {
      onIndexChange(selectedIndex + 1);
    }
  };

  const isPreviousDisabled = selectedIndex === 0;
  const isOnLastItem = selectedIndex === itemCount - 1;
  // Only disable next button if on last item AND no custom onNext handler is provided
  const isNextDisabled = isOnLastItem && !onNext;

  return (
    <div className="flex border-t border-[#E6E6E6] dark:border-[#1a1a1a]">
      {/* Left spacer matching list width (50%) */}
      <div className="w-1/2 bg-[#F6F6F6] dark:bg-[#1a1a1a]" />

      {/* Right section - navigation buttons (50%) */}
      <div className="w-1/2 bg-white dark:bg-[#121212] border-l border-[#E6E6E6] dark:border-[#3a3a3a]">
        <div className="flex justify-end items-center px-2 py-4 gap-3 backdrop-blur-[2px]">
          {/* More actions (if provided) */}
          {moreActions}

          {/* Previous arrow button */}
          <Button
            size="sm"
            onClick={handlePrevious}
            disabled={isPreviousDisabled}
            className="flex items-center justify-center px-2.5 py-1 w-8 h-7 bg-[#F6F6F6] dark:bg-[#2a2a2a] rounded-[12px] hover:bg-[#E6E6E6] dark:hover:bg-[#3a3a3a] disabled:opacity-50"
            data-testid="previous-arrow-button"
          >
            <ChevronLeft
              size={16}
              className="text-[#080705] dark:text-[#FAFFFD]"
            />
          </Button>

          {/* Save & Next button */}
          <Button
            size="sm"
            onClick={handleNext}
            disabled={isNextDisabled}
            className="flex items-center justify-center px-2.5 py-1 gap-1.5 h-7 bg-[#15786A] hover:bg-[#15786A]/90 dark:bg-[#15786A] dark:hover:bg-[#0f5d52] text-[#FAFFFD] rounded-[12px] disabled:opacity-50"
            data-testid="save-next-button"
          >
            <span className="text-xs font-normal leading-[15px] text-[#FAFFFD]">
              {nextButtonLabel}
            </span>
            <ChevronRight size={12} className="text-[#FAFFFD]" />
          </Button>
        </div>
      </div>
    </div>
  );
}
