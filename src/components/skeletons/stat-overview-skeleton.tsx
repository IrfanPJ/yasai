import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatOverviewSkeletonProps {
  cards?: number;
  listRows?: number;
}

// For dashboard-style overview pages (Finance home, Manifest overview, the
// root Dashboard) — a row of stat cards plus a recent-activity list below.
export function StatOverviewSkeleton({ cards = 4, listRows = 5 }: StatOverviewSkeletonProps) {
  return (
    <div className="flex-1 p-4 lg:p-6 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-none shadow-sm">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-4 w-32 mb-1" />
          {Array.from({ length: listRows }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
