import { Header } from "@/components/layout/header";
import { StatsCards, CargoBreakdown } from "@/components/dashboard/stats-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import type { DashboardStats, GoodsCollectionNote } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();

  const [
    { count: total },
    { count: todayCount },
    { count: pending },
    { data: weightData },
    { data: cargoData },
    { data: recentData },
  ] = await Promise.all([
    supabase
      .from("goods_collection_notes")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("goods_collection_notes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd)
      .is("deleted_at", null),
    supabase
      .from("goods_collection_notes")
      .select("*", { count: "exact", head: true })
      .not("status", "eq", "delivered")
      .is("deleted_at", null),
    supabase
      .from("goods_collection_notes")
      .select("weight_kg")
      .is("deleted_at", null),
    supabase
      .from("goods_collection_notes")
      .select("cargo_type")
      .is("deleted_at", null),
    supabase
      .from("goods_collection_notes")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const totalWeight =
    weightData?.reduce((sum, r) => sum + (r.weight_kg || 0), 0) || 0;

  const byCargo = { air: 0, sea: 0, land: 0 };
  cargoData?.forEach((r) => {
    if (r.cargo_type in byCargo) {
      byCargo[r.cargo_type as keyof typeof byCargo]++;
    }
  });

  const stats: DashboardStats = {
    total_collections: total || 0,
    today_collections: todayCount || 0,
    pending_deliveries: pending || 0,
    total_weight: totalWeight,
    by_cargo_type: byCargo,
  };

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={`Welcome back — ${format(today, "EEEE, dd MMMM yyyy")}`}
      />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Quick Action */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Overview
            </h2>
          </div>
          <Button asChild variant="secondary" size="sm" className="gap-2">
            <Link href="/collections/new">
              <PlusCircle className="h-4 w-4" />
              New Collection
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <StatsCards stats={stats} />

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <RecentActivity items={(recentData || []) as GoodsCollectionNote[]} />
          </div>
          <div>
            <CargoBreakdown stats={stats} />
          </div>
        </div>
      </div>
    </>
  );
}
