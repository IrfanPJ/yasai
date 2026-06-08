import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { GoodsCollectionNote } from "@/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/types";

interface RecentActivityProps {
  items: GoodsCollectionNote[];
}

const CARGO_ICONS: Record<string, string> = {
  air: "✈",
  sea: "🚢",
  land: "🚛",
};

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Collections</CardTitle>
        <Link
          href="/collections"
          className="text-xs text-[#E67A32] hover:underline flex items-center gap-1"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            No collections yet. Create your first one!
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/collections/${item.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors group"
              >
                {/* Cargo Icon */}
                <div className="text-2xl w-9 text-center flex-shrink-0">
                  {CARGO_ICONS[item.cargo_type] || "📦"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-[#071A3A] dark:text-white font-mono">
                      {item.collection_number}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.shipper_name} → {item.consignee_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.destination} · {formatDateTime(item.created_at)}
                  </p>
                </div>

                {/* Status */}
                <div className="flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_COLORS[item.status]
                    }`}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
