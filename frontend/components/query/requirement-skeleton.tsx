import { Skeleton } from "@/components/ui/skeleton";

interface RequirementSkeletonProps {
  count?: number;
}

export function RequirementSkeleton({ count = 2 }: RequirementSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-start p-0 border border-border rounded-lg flex-none self-stretch flex-grow-0 bg-card"
        >
          {/* Header skeleton */}
          <div className="flex flex-row items-center p-2 gap-2 w-full border-b border-border bg-muted">
            <Skeleton className="w-3.5 h-3.5 rounded" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="w-7 h-7 rounded-xl" />
          </div>
          {/* Content skeleton */}
          <div className="flex flex-col items-start p-4 gap-2 w-full">
            <div className="w-full">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="w-full">
              <Skeleton className="h-5 w-20 mb-2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
