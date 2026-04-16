"use client";

import { ReactNode } from "react";

interface RequirementCardProps {
  /** Requirement id / key shown once at the top of the body, above Description */
  title?: ReactNode;
  description: ReactNode;
  typeBadges?: ReactNode;
  statusBadge?: ReactNode;
  implementationDescription?: ReactNode;
  verificationDescription?: ReactNode;
  footer?: ReactNode;
  pinFooterToBottom?: boolean;
  showVerification?: boolean;
}

export function RequirementCard({
  title,
  description,
  typeBadges,
  statusBadge,
  implementationDescription,
  verificationDescription,
  footer,
  pinFooterToBottom = false,
  showVerification = true,
}: RequirementCardProps) {
  const shellClass = pinFooterToBottom
    ? "flex flex-col items-stretch p-0 flex-none self-stretch h-full flex-grow-0"
    : "flex flex-col items-stretch p-0 flex-none self-stretch flex-grow-0";

  const borderedClass = `flex flex-col items-stretch overflow-hidden rounded-lg border border-semantic-stroke bg-semantic-bg-elevation-2 self-stretch ${
    pinFooterToBottom ? "min-h-0 flex-1" : "flex-none flex-grow-0"
  }`;

  const bodyClass = `flex flex-col items-start gap-2 self-stretch w-full min-h-0 px-4 pb-4 pt-4 ${
    pinFooterToBottom ? "flex-1" : "flex-grow-0"
  }`;

  return (
    <div className={shellClass} data-testid="requirement-card">
      <div className={borderedClass}>
        <div className={bodyClass}>
          {title ? (
            <div className="flex w-full flex-none flex-col items-start pb-1">
              {title}
            </div>
          ) : null}

          {/* Description field */}
          <div className="flex flex-none flex-grow-0 flex-col items-start gap-1 self-stretch">
            <div className="flex w-full flex-row items-center gap-2">
              <span className="font-inter text-sm font-semibold leading-5 text-semantic-emphasis">
                Description
              </span>
              <div className="flex flex-row flex-wrap items-center gap-2">
                {typeBadges}
              </div>
            </div>
            <div className="flex w-full flex-row items-center rounded px-0 py-2">
              <div className="w-full font-inter text-sm font-normal leading-[150%] text-semantic-text">
                {description || "N/A"}
              </div>
            </div>
          </div>

          {/* Implementation field */}
          <div className="flex flex-none flex-grow-0 flex-col items-start gap-1 self-stretch">
            <div className="flex w-full flex-row items-center gap-2">
              <span className="font-inter text-sm font-semibold leading-5 text-semantic-emphasis">
                Implementation
              </span>
              {statusBadge}
            </div>
            <div className="flex w-full flex-row items-center rounded px-0 py-2">
              <div className="w-full font-inter text-sm font-normal leading-[150%] text-semantic-text">
                {implementationDescription || "N/A"}
              </div>
            </div>
          </div>

          {/* Requirement Verification field */}
          {showVerification && verificationDescription && (
            <div className="flex flex-none flex-grow-0 flex-col items-start gap-1 self-stretch">
              <span className="font-inter text-sm font-semibold leading-5 text-semantic-emphasis">
                Requirement Verification
              </span>
              <div className="flex w-full flex-row items-center rounded px-0 py-2">
                <div className="w-full font-inter text-sm font-normal leading-[150%] text-semantic-text">
                  {verificationDescription}
                </div>
              </div>
            </div>
          )}
        </div>

        {footer ? (
          <div className="w-full flex-none border-t border-semantic-stroke bg-semantic-highlight p-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
