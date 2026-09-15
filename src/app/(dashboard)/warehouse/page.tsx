import Link from "next/link";
import { Warehouse as WarehouseIcon, Package, Clock, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import type { GoodsCollectionNote, TrackingEvent } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Warehouse" };

export default async function WarehousePage() {
  const supabase = await createClient();

  const [{ data: warehouses }, { data: gcns }, { data: pendingTransfers }] = await Promise.all([
    supabase.from("warehouses").select("*").eq("is_active", true).order("country").order("code"),
    supabase
      .from("goods_collection_notes")
      .select("id, warehouse_id, weight_kg, volume_cbm")
      .eq("status", "in_warehouse")
      .is("deleted_at", null),
    supabase
      .from("gcn_tracking_events")
      .select(`
        *,
        from_warehouse:warehouses!gcn_tracking_events_from_warehouse_id_fkey(id, code, name),
        to_warehouse:warehouses!gcn_tracking_events_to_warehouse_id_fkey(id, code, name),
        requested_by_user:user_profiles!gcn_tracking_events_requested_by_fkey(id, full_name),
        gcn:goods_collection_notes(id, collection_number, shipper_name, consignee_name)
      `)
      .eq("event_type", "warehouse_transfer")
      .eq("approval_status", "pending")
      .order("requested_at", { ascending: false }),
  ]);

  const contents = (gcns || []) as Pick<GoodsCollectionNote, "id" | "warehouse_id" | "weight_kg" | "volume_cbm">[];
  const transfers = (pendingTransfers || []) as TrackingEvent[];

  return (
    <>
      <Header title="Warehouse" subtitle="Where every GCN is right now, and moving it between warehouses" />
      <div className="flex-1 p-4 lg:p-6 space-y-6">
        {transfers.length > 0 && (
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                Pending Transfers ({transfers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {transfers.map((t) => (
                <Link
                  key={t.id}
                  href={`/collections/${t.gcn_id}`}
                  className="flex items-center justify-between py-2.5 text-sm hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div>
                    <span className="font-mono font-medium">{t.gcn?.collection_number}</span>
                    <span className="text-muted-foreground ml-2">
                      {t.from_warehouse?.code ?? "—"} → {t.to_warehouse?.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {t.requested_by_user?.full_name} · {formatDateTime(t.requested_at)}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(warehouses || []).map((w) => {
            const here = contents.filter((g) => g.warehouse_id === w.id);
            const totalWeight = here.reduce((s, g) => s + (g.weight_kg || 0), 0);
            const totalCbm = here.reduce((s, g) => s + (g.volume_cbm || 0), 0);
            return (
              <Link key={w.id} href={`/warehouse/${w.id}`}>
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#071A3A]/10 dark:bg-white/10 p-2 rounded-lg">
                          <WarehouseIcon className="h-4 w-4 text-[#071A3A] dark:text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#071A3A] dark:text-white">{w.code}</p>
                          <p className="text-xs text-muted-foreground">{w.name}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{w.country}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        {here.length} GCN{here.length === 1 ? "" : "s"}
                      </span>
                      <span className="text-muted-foreground">{totalWeight.toFixed(0)} kg</span>
                      <span className="text-muted-foreground">{totalCbm.toFixed(2)} m³</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
