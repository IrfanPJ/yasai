import Link from "next/link";
import { History } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ManifestOverview } from "@/components/manifest/manifest-overview";
import { createServiceClient } from "@/lib/supabase/server";
import type { ConsolidationSheet, ManifestZone } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manifest" };

export default async function ManifestPage() {
  const serviceClient = createServiceClient();
  const [{ data }, { data: queuedRows }] = await Promise.all([
    serviceClient
      .from("consolidation_sheets")
      .select("*")
      .order("created_at", { ascending: false }),
    serviceClient
      .from("consolidation_sheet_removals")
      .select("zone")
      .is("requeued_sheet_id", null)
      .is("restored_at", null),
  ]);

  const queuedCounts: Record<ManifestZone, number> = { mainland: 0, jafza: 0 };
  for (const row of queuedRows || []) {
    const zone = row.zone as ManifestZone;
    queuedCounts[zone] = (queuedCounts[zone] || 0) + 1;
  }

  return (
    <>
      <Header title="Manifest" subtitle="Pending consolidation sheets and finalized manifests, by warehouse zone" />
      <div className="flex-1 p-4 lg:p-6 space-y-4">
        <div className="flex justify-end">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/manifest/history">
              <History className="h-3.5 w-3.5" />
              Removal History
            </Link>
          </Button>
        </div>
        <ManifestOverview sheets={(data || []) as ConsolidationSheet[]} queuedCounts={queuedCounts} />
      </div>
    </>
  );
}
