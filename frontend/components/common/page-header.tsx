"use client";

import { Fragment, ReactNode } from "react";
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

  const barClass =
    "bg-semantic-bg-elevation-1 border-b border-semantic-stroke";
  const crumbClass = "font-inter text-xs leading-4 text-semantic-text";
  const backButtonClass =
    "flex flex-row justify-center items-center pl-2 pr-2.5 py-1 gap-1.5 h-auto rounded-[4px] bg-semantic-bg-elevation-2 text-semantic-text border border-semantic-stroke hover:bg-semantic-highlight hover:text-semantic-text active:bg-semantic-highlight";
  const backIconClass = "text-semantic-text";

  return (
    <div
      className={`flex flex-row items-center w-full h-16 p-4 gap-2.5 ${barClass}`}
    >
      {/* Back button and breadcrumb */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(backPath)}
        className={backButtonClass}
      >
        <ChevronLeft size={12} className={backIconClass} />
        <span className="font-inter text-xs leading-4 font-normal text-semantic-text">
          {backLabel}
        </span>
      </Button>

      {breadcrumbs.map((item, index) => (
        <Fragment key={`crumb-${index}`}>
          <span className={`${crumbClass} font-normal`}>/</span>
          {item.path ? (
            <button
              onClick={() => router.push(item.path!)}
              className={`${crumbClass} font-normal hover:underline cursor-pointer`}
            >
              {item.label}
            </button>
          ) : (
            <span
              className={`${crumbClass} ${
                item.isBold ? "font-medium" : "font-normal"
              }`}
            >
              {item.label}
            </span>
          )}
        </Fragment>
      ))}

      {/* Spacer */}
      <div className="flex-grow" />

      {/* Actions */}
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
