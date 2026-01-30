"use client";

import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { getStatusBadgeStyles } from "@/lib/utils/question-modal";

interface RequirementCardProps {
  description: string;
  types?: string[];
  implementationStatus?: string;
  implementationDescription?: string;
  verificationDescription?: string;
  header?: ReactNode;
  actions?: ReactNode;
  showVerification?: boolean;
}

export function RequirementCard({
  description,
  types = [],
  implementationStatus = "To do",
  implementationDescription = "",
  verificationDescription = "",
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
          {/* Description header with type badges */}
          <div className="flex flex-row items-center gap-2 w-full">
            <span className="font-inter font-semibold text-sm leading-5 text-[#1C2024]">
              Description
            </span>
            <div className="flex flex-row items-center gap-2 flex-wrap">
              {types.map((type, index) => (
                <Badge
                  key={index}
                  className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1.5 h-5 bg-[rgba(0,71,241,0.07)] rounded-[3px] font-inter font-medium text-xs leading-4 tracking-[0.04px] text-[rgba(0,43,183,0.77)]"
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
          {/* Description text */}
          <div className="flex flex-row items-center py-2 px-0 w-full rounded">
            <div className="w-full font-inter font-normal text-sm leading-[150%] text-[#080705]">
              {description || "N/A"}
            </div>
          </div>
        </div>

        {/* Implementation field */}
        <div className="flex flex-col items-start p-0 gap-1 flex-none order-1 self-stretch flex-grow-0">
          {/* Implementation header with status badge */}
          <div className="flex flex-row items-center gap-2 w-full">
            <span className="font-inter font-semibold text-sm leading-5 text-[#1C2024]">
              Implementation
            </span>
            <Badge
              className={`px-1.5 py-0.5 text-xs font-medium rounded ${getStatusBadgeStyles(implementationStatus)}`}
            >
              {implementationStatus}
            </Badge>
          </div>
          {/* Implementation text */}
          <div className="flex flex-row items-center py-2 px-0 w-full rounded">
            <div className="w-full font-inter font-normal text-sm leading-[150%] text-[#080705]">
              {implementationDescription || "N/A"}
            </div>
          </div>
        </div>

        {/* Requirement Verification field - only show if has content and showVerification is true */}
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
