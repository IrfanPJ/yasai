import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ManifestSheetDetail } from "@/components/manifest/manifest-sheet-detail";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import type { ConsolidationSheet, ConsolidationSheetItem, ConsolidationSheetRemoval, GrReportEntry, UserRole } from "@/types";
import { MANIFEST_ZONE_LABELS } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }>; }

export default async function ManifestSheetPage({ params }: PageProps) {
  const { id } = await params;
  const serviceClient = createServiceClient();
  const supabase = await createClient();

  const [{ data: sheet, error }, { data: items }, { data: { user } }] = await Promise.all([
    serviceClient.from("consolidation_sheets").select("*, job_order:job_orders(job_number)").eq("id", id).single(),
    serviceClient
      .from("consolidation_sheet_items")
      .select("*, gcn:goods_collection_notes(*)")
      .eq("sheet_id", id)
      .order("position"),
    supabase.auth.getUser(),
  ]);

  if (error || !sheet) notFound();

  // F/D/I document status for each GCN on this sheet — keyed by gcn_id so
  // the grid can show/upload the three docs without a per-row round trip.
  const gcnIds = (items || []).map((it) => it.gcn_id);
  const { data: grReportEntries } = gcnIds.length
    ? await serviceClient.from("gr_report_entries").select("*").in("gcn_id", gcnIds)
    : { data: [] as GrReportEntry[] };
  const grReportByGcnId: Record<string, GrReportEntry> = Object.fromEntries(
    (grReportEntries || []).map((e) => [e.gcn_id, e])
  );

  // Items removed from THIS sheet, still waiting — can be undone right here.
  // Items queued elsewhere in the zone (from an already-converted sheet) can't
  // be restored to this sheet, only shown as a heads-up (they'll join whatever
  // sheet opens after this one converts).
  const [{ data: restorable }, { count: elsewhereQueuedCount }] = await Promise.all([
    serviceClient
      .from("consolidation_sheet_removals")
      .select("*, gcn:goods_collection_notes(collection_number, consignee_name, shipper_name)")
      .eq("original_sheet_id", id)
      .is("requeued_sheet_id", null)
      .is("restored_at", null)
      .order("removed_at", { ascending: false }),
    serviceClient
      .from("consolidation_sheet_removals")
      .select("id", { count: "exact", head: true })
      .eq("zone", sheet.zone)
      .neq("original_sheet_id", id)
      .is("requeued_sheet_id", null)
      .is("restored_at", null),
  ]);

  let userRole: UserRole = "viewer";
  if (user) {
    const { data: profile } = await serviceClient.from("user_profiles").select("role").eq("id", user.id).single();
    if (profile) userRole = profile.role as UserRole;
  }

  const typedSheet = sheet as ConsolidationSheet;

  return (
    <>
      <Header
        title={typedSheet.sheet_number}
        subtitle={`${MANIFEST_ZONE_LABELS[typedSheet.zone]} ${typedSheet.status === "manifest" ? "Manifest" : "Pending Consolidation Sheet"}`}
      />
      <div className="flex-1 p-4 lg:p-6">
        <ManifestSheetDetail
          sheet={typedSheet}
          items={(items || []) as ConsolidationSheetItem[]}
          userRole={userRole}
          restorableRemovals={(restorable || []) as ConsolidationSheetRemoval[]}
          elsewhereQueuedCount={elsewhereQueuedCount ?? 0}
          grReportByGcnId={grReportByGcnId}
        />
      </div>
    </>
  );
}
