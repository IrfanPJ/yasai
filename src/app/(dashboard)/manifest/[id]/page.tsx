import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ManifestSheetDetail } from "@/components/manifest/manifest-sheet-detail";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import type { ConsolidationSheet, ConsolidationSheetItem, UserRole } from "@/types";
import { MANIFEST_ZONE_LABELS } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }>; }

export default async function ManifestSheetPage({ params }: PageProps) {
  const { id } = await params;
  const serviceClient = createServiceClient();
  const supabase = await createClient();

  const [{ data: sheet, error }, { data: items }, { data: { user } }] = await Promise.all([
    serviceClient.from("consolidation_sheets").select("*").eq("id", id).single(),
    serviceClient
      .from("consolidation_sheet_items")
      .select("*, gcn:goods_collection_notes(*)")
      .eq("sheet_id", id)
      .order("position"),
    supabase.auth.getUser(),
  ]);

  if (error || !sheet) notFound();

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
        />
      </div>
    </>
  );
}
