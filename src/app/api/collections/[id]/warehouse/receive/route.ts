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

  const { data, error } = await serviceClient
    .from("goods_collection_notes")
    .update({
      warehouse_received_by: user.id,
      warehouse_received_at: new Date().toISOString(),
      storage_location: storageLocation,
      palletized: Boolean(body.palletized),
      status: "in_warehouse",
      updated_by: user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "WAREHOUSE_RECEIVED",
    entity_type: "goods_collection_notes",
    entity_id: id,
    details: { storage_location: storageLocation, palletized: Boolean(body.palletized) },
  });

  return NextResponse.json(data);
}
