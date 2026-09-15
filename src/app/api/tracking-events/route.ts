import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SELECT = `
  *,
  from_warehouse:warehouses!gcn_tracking_events_from_warehouse_id_fkey(id, code, name, country),
  to_warehouse:warehouses!gcn_tracking_events_to_warehouse_id_fkey(id, code, name, country),
  requested_by_user:user_profiles!gcn_tracking_events_requested_by_fkey(id, full_name),
  approved_by_user:user_profiles!gcn_tracking_events_approved_by_fkey(id, full_name),
  gcn:goods_collection_notes(id, collection_number, shipper_name, consignee_name)
`;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();
  const { searchParams } = new URL(request.url);
  const gcnId = searchParams.get("gcn_id");
  const approvalStatus = searchParams.get("approval_status");

  let query = serviceClient
    .from("gcn_tracking_events")
    .select(SELECT)
    .order("created_at", { ascending: false });

  if (gcnId) query = query.eq("gcn_id", gcnId);
  if (approvalStatus) query = query.eq("approval_status", approvalStatus);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
