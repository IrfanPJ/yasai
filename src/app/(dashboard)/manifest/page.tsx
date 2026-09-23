import { Header } from "@/components/layout/header";
import { ManifestOverview } from "@/components/manifest/manifest-overview";
import { createServiceClient } from "@/lib/supabase/server";
import type { ConsolidationSheet } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manifest" };

export default async function ManifestPage() {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("consolidation_sheets")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <Header title="Manifest" subtitle="Pending consolidation sheets and finalized manifests, by warehouse zone" />
      <div className="flex-1 p-4 lg:p-6">
        <ManifestOverview sheets={(data || []) as ConsolidationSheet[]} />
      </div>
    </>
  );
}
