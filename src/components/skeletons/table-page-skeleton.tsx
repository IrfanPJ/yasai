import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TablePageSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

// Generic skeleton for a search/filter toolbar above a data table — used by
// every list page's loading.tsx. Doesn't need to match each table's exact
// column layout, just needs to read as "a table is about to appear here"
// so navigation doesn't feel like it froze.
export function TablePageSkeleton({ rows = 8, columns = 6, className }: TablePageSkeletonProps) {
  return (
    <div className={cn("flex-1 p-4 lg:p-6 space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24 ml-auto" />
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0 overflow-hidden">
          <div className="flex items-center gap-4 border-b px-4 py-3">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0">
              {Array.from({ length: columns }).map((_, c) => (
                <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "max-w-[110px]")} />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
