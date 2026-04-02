"use client";

import { ReactNode } from "react";

interface RequirementCardProps {
  description: ReactNode;
  typeBadges?: ReactNode;
  statusBadge?: ReactNode;
  implementationDescription?: ReactNode;
  verificationDescription?: ReactNode;
  header?: ReactNode;
  actions?: ReactNode;
  showVerification?: boolean;
}

export function RequirementCard({
  description,
  typeBadges,
  statusBadge,
  implementationDescription,
  verificationDescription,
  header,
  actions,
  showVerification = true,
}: RequirementCardProps) {
  return (
    <div
      className="flex flex-col items-start p-0 border border-[#E6E6E6] rounded-lg flex-none self-stretch flex-grow-0 bg-white"
      data-testid="requirement-card"
    >
      {/* Header (if provided) */}
      {header && (
        <div className="flex flex-row items-center p-0 gap-2 h-11 border-b border-[#E6E6E6] flex-none order-0 self-stretch">
          <div className="flex flex-row items-center p-2 gap-2 h-11 bg-[#F6F6F6] flex-none order-0 flex-grow">
            {header}
            {actions && <div className="flex gap-2 ml-auto">{actions}</div>}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col items-start p-4 gap-2 flex-none order-1 self-stretch flex-grow-0 w-full">
        {/* Description field */}
        <div className="flex flex-col items-start p-0 gap-1 flex-none order-0 self-stretch flex-grow-0">
          <div className="flex flex-row items-center gap-2 w-full">
            <span className="font-inter font-semibold text-sm leading-5 text-[#1C2024]">
              Description
            </span>
            <div className="flex flex-row items-center gap-2 flex-wrap">
              {typeBadges}
            </div>
          </div>
          <div className="flex flex-row items-center py-2 px-0 w-full rounded">
            <div className="w-full font-inter font-normal text-sm leading-[150%] text-[#080705]">
              {description || "N/A"}
            </div>
          </div>
        </div>

        {/* Implementation field */}
        <div className="flex flex-col items-start p-0 gap-1 flex-none order-1 self-stretch flex-grow-0">
          <div className="flex flex-row items-center gap-2 w-full">
            <span className="font-inter font-semibold text-sm leading-5 text-[#1C2024]">
              Implementation
            </span>
            {statusBadge}
          </div>
          <div className="flex flex-row items-center py-2 px-0 w-full rounded">
            <div className="w-full font-inter font-normal text-sm leading-[150%] text-[#080705]">
              {implementationDescription || "N/A"}
            </div>
          </div>
        </div>

        {/* Requirement Verification field */}
        {showVerification && verificationDescription && (
          <div className="flex flex-col items-start p-0 gap-1 flex-none order-2 self-stretch flex-grow-0">
            <span className="font-inter font-semibold text-sm leading-5 text-[#1C2024]">
              Requirement Verification
            </span>
            <div className="flex flex-row items-center py-2 px-0 w-full rounded">
              <div className="w-full font-inter font-normal text-sm leading-[150%] text-[#080705]">
                {verificationDescription}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
