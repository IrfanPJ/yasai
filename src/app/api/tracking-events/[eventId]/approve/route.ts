import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

const APPROVER_ROLES = ["admin", "operations", "warehouse_supervisor"] as const;

export async function POST(_: unknown, { params }: RouteParams) {
  const { eventId } = await params;
  const auth = await requireRole([...APPROVER_ROLES]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { data: event } = await serviceClient
    .from("gcn_tracking_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (event.approval_status !== "pending") {
    return NextResponse.json({ error: "This transfer has already been actioned" }, { status: 409 });
  }

  const now = new Date().toISOString();

  const { data: destWarehouse } = await serviceClient
    .from("warehouses")
    .select("code")
    .eq("id", event.to_warehouse_id)
    .single();

  const [{ error: eventError }, { error: gcnError }] = await Promise.all([
    serviceClient
      .from("gcn_tracking_events")
      .update({ approval_status: "approved", approved_by: user.id, approved_at: now })
      .eq("id", eventId),
    serviceClient
      .from("goods_collection_notes")
      .update({
        warehouse_id: event.to_warehouse_id,
        storage_location: destWarehouse?.code ?? null,
        updated_by: user.id,
      })
      .eq("id", event.gcn_id),
  ]);

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
  if (gcnError) return NextResponse.json({ error: gcnError.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "WAREHOUSE_TRANSFER_APPROVED",
    entity_type: "goods_collection_notes",
    entity_id: event.gcn_id,
    details: { tracking_event_id: eventId, to_warehouse_id: event.to_warehouse_id },
  });

  return NextResponse.json({ ok: true });
}
