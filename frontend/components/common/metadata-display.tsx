"use client";

import { Calendar } from "lucide-react";

interface MetadataRowProps {
  label: string;
  value: string | number;
  testId?: string;
  className?: string;
}

export function MetadataRow({
  label,
  value,
  testId,
  className,
}: MetadataRowProps) {
  return (
    <div className="flex justify-start items-center gap-2 pb-2">
      <span className="text-sm text-gray-500 dark:text-[#FAFFFD]">{label}</span>
      <span
        className={`text-sm font-medium text-black dark:text-[#FAFFFD] ${className || ""}`}
        data-testid={testId}
      >
        {value}
      </span>
    </div>
  );
}

interface TimestampRowProps {
  label: string;
  date?: string;
  formatDate?: (date?: string) => string;
}

export function TimestampRow({ label, date, formatDate }: TimestampRowProps) {
  const displayDate = formatDate ? formatDate(date) : date || "N/A";

  return (
    <div className="flex items-center gap-2 pb-2">
      <Calendar size={14} className="text-gray-500 dark:text-[#FAFFFD]" />
      <div>
        <div className="text-sm text-gray-500 dark:text-[#FAFFFD]">{label}</div>
        <div className="text-sm text-black dark:text-[#FAFFFD]">
          {displayDate}
        </div>
      </div>
    </div>
  );
}

interface MetadataSectionProps {
  title: string;
  children: React.ReactNode;
}

export function MetadataSection({ title, children }: MetadataSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-black dark:text-[#FAFFFD]">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
