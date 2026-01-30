"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BreadcrumbItem {
  label: string;
  path?: string;
  isBold?: boolean;
}

interface PageHeaderProps {
  backPath: string;
  backLabel?: string;
  breadcrumbs: BreadcrumbItem[];
  actions?: ReactNode;
}

export function PageHeader({
  backPath,
  backLabel = "Back",
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-row items-center w-full h-16 bg-[#F6F6F6] dark:bg-[#1a1a1a] border-b border-[#E6E6E6] dark:border-[#2a2a2a] p-4 gap-2.5">
      {/* Back button and breadcrumb */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(backPath)}
        className="flex flex-row justify-center items-center px-2 gap-1 rounded-[14px]"
      >
        <ChevronLeft size={16} className="text-black dark:text-[#FAFFFD]" />
        <span className="font-sans text-sm leading-4 text-black dark:text-[#FAFFFD] font-normal">
          {backLabel}
        </span>
      </Button>

      {breadcrumbs.map((item, index) => (
        <>
          <span
            key={`sep-${index}`}
            className="font-sans text-xs leading-[14px] text-black dark:text-[#FAFFFD] font-normal"
          >
            /
          </span>
          {item.path ? (
            <button
              key={`item-${index}`}
              onClick={() => router.push(item.path!)}
              className="font-sans text-sm leading-4 text-black dark:text-[#FAFFFD] font-normal hover:underline cursor-pointer"
            >
              {item.label}
            </button>
          ) : (
            <span
              key={`item-${index}`}
              className={`font-sans text-sm leading-4 text-black dark:text-[#FAFFFD] ${
                item.isBold ? "font-bold" : "font-normal"
              }`}
            >
              {item.label}
            </span>
          )}
        </>
      ))}

      {/* Spacer */}
      <div className="flex-grow" />

      {/* Action buttons */}
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
