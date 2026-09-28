import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("consolidation_sheet_removals")
    .select(`
      *,
      gcn:goods_collection_notes(collection_number, consignee_name, shipper_name),
      original_sheet:consolidation_sheets!consolidation_sheet_removals_original_sheet_id_fkey(sheet_number, status),
      requeued_sheet:consolidation_sheets!consolidation_sheet_removals_requeued_sheet_id_fkey(sheet_number, status)
    `)
    .order("removed_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
