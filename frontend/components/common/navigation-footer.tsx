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
    <div className="flex border-t border-[#F6F6F6] dark:border-[#1a1a1a]">
      {/* Left spacer matching list width (50%) */}
      <div className="w-1/2 bg-[#F6F6F6] dark:bg-[#1a1a1a]" />

      {/* Right section - navigation buttons (50%) */}
      <div className="w-1/2 bg-[#FAFFFD] dark:bg-[#121212]">
        <div className="flex justify-end items-center p-4">
          {/* Navigation buttons */}
          <div className="flex flex-row justify-end items-center p-2 gap-3 bg-[rgba(246,246,246,0.6)] dark:bg-[rgba(26,26,26,0.6)] border border-[#E6E6E6] dark:border-[#3a3a3a] backdrop-blur-[2px] rounded-[18px]">
            {/* More actions (if provided) */}
            {moreActions}

            {/* Previous arrow button */}
            <Button
              size="sm"
              onClick={handlePrevious}
              disabled={isPreviousDisabled}
              className="flex items-center justify-center p-1 px-2.5 gap-1 w-8 h-7 bg-[#FAFFFD] dark:bg-[#2a2a2a] border-[0.96px] border-[#080705] dark:border-[#3a3a3a] rounded-xl hover:bg-[#f0f0f0] dark:hover:bg-[#3a3a3a] disabled:opacity-50"
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
              className="flex items-center justify-center p-1 px-2.5 gap-1.5 w-[107px] h-7 bg-[#15786A] hover:bg-[#15786A]/90 dark:bg-[#15786A] dark:hover:bg-[#0f5d52] text-[#FAFFFD] rounded-xl disabled:opacity-50"
              data-testid="save-next-button"
            >
              <span className="text-sm font-normal leading-[15px] text-[#FAFFFD]">
                {nextButtonLabel}
              </span>
              <ChevronRight size={16} className="text-[#FAFFFD]" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
