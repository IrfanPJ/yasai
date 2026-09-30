import { Header } from "@/components/layout/header";
import { ManifestRemovalHistory } from "@/components/manifest/manifest-removal-history";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import type { ConsolidationSheetRemoval, UserRole } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manifest History" };

export default async function ManifestHistoryPage() {
  const serviceClient = createServiceClient();
  const supabase = await createClient();

  const [{ data }, { data: { user } }] = await Promise.all([
    serviceClient
      .from("consolidation_sheet_removals")
      .select(`
        *,
        gcn:goods_collection_notes(collection_number, consignee_name, shipper_name),
        original_sheet:consolidation_sheets!consolidation_sheet_removals_original_sheet_id_fkey(sheet_number, status),
        requeued_sheet:consolidation_sheets!consolidation_sheet_removals_requeued_sheet_id_fkey(sheet_number, status)
      `)
      .order("removed_at", { ascending: false })
      .limit(200),
    supabase.auth.getUser(),
  ]);

  let userRole: UserRole = "viewer";
  if (user) {
    const { data: profile } = await serviceClient.from("user_profiles").select("role").eq("id", user.id).single();
    if (profile) userRole = profile.role as UserRole;
  }

  return (
    <>
      <Header title="Manifest History" subtitle="Every GCN removed from a pending consolidation sheet, and where it stands now" />
      <div className="flex-1 p-4 lg:p-6">
        <ManifestRemovalHistory removals={(data || []) as ConsolidationSheetRemoval[]} userRole={userRole} />
      </div>
    </>
  );
}
