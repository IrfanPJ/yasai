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

  const body = await request.json();
  const storageLocation = typeof body.storage_location === "string" ? body.storage_location.trim() : "";
  if (!storageLocation) {
    return NextResponse.json({ error: "storage_location is required" }, { status: 400 });
  }

  // Only allow editing before report is approved
  const { data: existing } = await serviceClient
    .from("goods_collection_notes")
    .select("warehouse_report_status")
    .eq("id", id)
    .single();

  if (existing?.warehouse_report_status === "approved") {
    return NextResponse.json({ error: "Cannot edit receiving details after report is approved" }, { status: 409 });
  }

  const { data, error } = await serviceClient
    .from("goods_collection_notes")
    .update({
      storage_location: storageLocation,
      palletized: Boolean(body.palletized),
      updated_by: user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "WAREHOUSE_RECEIVING_UPDATED",
    entity_type: "goods_collection_notes",
    entity_id: id,
    details: { storage_location: storageLocation, palletized: Boolean(body.palletized) },
  });

  return NextResponse.json(data);
}
