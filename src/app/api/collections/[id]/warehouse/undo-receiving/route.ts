import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  // Only allow undo before report is submitted
  const { data: existing } = await serviceClient
    .from("goods_collection_notes")
    .select("warehouse_report_status, warehouse_received_at")
    .eq("id", id)
    .single();

  if (!existing?.warehouse_received_at) {
    return NextResponse.json({ error: "Goods have not been received yet" }, { status: 409 });
  }

  if (existing?.warehouse_report_status === "submitted" || existing?.warehouse_report_status === "approved") {
    return NextResponse.json({ error: "Cannot undo receiving after report has been submitted or approved" }, { status: 409 });
  }

  const { data, error } = await serviceClient
    .from("goods_collection_notes")
    .update({
      warehouse_received_at: null,
      warehouse_received_by: null,
      storage_location: null,
      palletized: false,
      warehouse_report_status: "not_submitted",
      warehouse_report_notes: null,
      warehouse_report_rejection_reason: null,
      status: "collected",
      updated_by: user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "WAREHOUSE_RECEIVING_UNDONE",
    entity_type: "goods_collection_notes",
    entity_id: id,
    details: { note: "Receiving reset to collected status" },
  });

  return NextResponse.json(data);
}
