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

interface FloatingNavigationFooterProps extends NavigationFooterProps {
  /** Extra className for positioning (e.g. absolute bottom/right) */
  className?: string;
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
    <div className="flex border-t border-semantic-stroke bg-semantic-bg-elevation-1">
      {/* Left spacer matching list width (50%) */}
      <div className="w-1/2 bg-semantic-bg-elevation-1" />

      {/* Right section - navigation buttons (50%) */}
      <div className="w-1/2 bg-semantic-bg-elevation-2 border-l border-semantic-stroke">
        <div className="flex justify-end items-center px-2 py-4 gap-3">
          {/* More actions (if provided) */}
          {moreActions}

          {/* Previous arrow button */}
          <Button
            size="sm"
            onClick={handlePrevious}
            disabled={isPreviousDisabled}
            className="flex items-center justify-center px-2.5 py-1 w-8 h-7 !bg-semantic-bg-elevation-1 dark:!bg-semantic-bg-elevation-1 border border-semantic-stroke rounded-[4px] hover:!bg-semantic-highlight dark:hover:!bg-semantic-highlight disabled:opacity-50"
            data-testid="previous-arrow-button"
          >
            <ChevronLeft size={16} className="text-semantic-text" />
          </Button>

          {/* Save & Next button */}
          <Button
            size="sm"
            onClick={handleNext}
            disabled={isNextDisabled}
            className="flex items-center justify-center px-2.5 py-1 gap-1.5 h-7 !bg-semantic-success-fg dark:!bg-semantic-success-fg hover:!bg-semantic-indicator-4 dark:hover:!bg-semantic-indicator-4 !text-semantic-white dark:!text-semantic-white rounded-[4px] disabled:opacity-50"
            data-testid="save-next-button"
          >
            <span className="text-xs font-normal leading-[15px] text-semantic-white">
              {nextButtonLabel}
            </span>
            <ChevronRight size={12} className="text-semantic-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FloatingNavigationFooter({
  itemCount,
  selectedIndex,
  onIndexChange,
  onNext,
  nextButtonLabel = "Save & Next",
  moreActions,
  className,
}: FloatingNavigationFooterProps) {
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
  const isNextDisabled = isOnLastItem && !onNext;

  return (
    <div
      className={[
        "z-50 flex items-center justify-end gap-1.5 rounded-[10px] border border-semantic-stroke bg-semantic-bg-elevation-2 p-1.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="floating-navigation-footer"
    >
      {moreActions}

      <Button
        size="sm"
        onClick={handlePrevious}
        disabled={isPreviousDisabled}
        className="flex items-center justify-center px-2.5 py-1 h-7 !bg-semantic-bg-elevation-1 dark:!bg-semantic-bg-elevation-1 border border-semantic-stroke rounded-[4px] hover:!bg-semantic-highlight dark:hover:!bg-semantic-highlight disabled:opacity-50"
        data-testid="previous-arrow-button"
      >
        <ChevronLeft size={16} className="text-semantic-text" />
      </Button>

      <Button
        size="sm"
        onClick={handleNext}
        disabled={isNextDisabled}
        className="flex items-center justify-center px-2.5 py-1 gap-1.5 h-7 !bg-semantic-success-fg dark:!bg-semantic-success-fg hover:!bg-semantic-indicator-4 dark:hover:!bg-semantic-indicator-4 !text-semantic-white dark:!text-semantic-white rounded-[4px] disabled:opacity-50"
        data-testid="save-next-button"
      >
        <span className="text-xs font-normal leading-[15px] text-semantic-white">
          {nextButtonLabel}
        </span>
        <ChevronRight size={12} className="text-semantic-white" />
      </Button>
    </div>
  );
}
