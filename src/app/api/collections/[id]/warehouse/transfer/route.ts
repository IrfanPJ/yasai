import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const WAREHOUSE_ROLES = ["admin", "operations", "warehouse", "warehouse_supervisor"] as const;

// Request a transfer to another warehouse. Creates a *pending* tracking
// event — the GCN's warehouse_id doesn't change until a supervisor
// approves it (see /api/tracking-events/[eventId]/approve).
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole([...WAREHOUSE_ROLES]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const toWarehouseId = typeof body.to_warehouse_id === "string" ? body.to_warehouse_id : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;
  if (!toWarehouseId) {
    return NextResponse.json({ error: "to_warehouse_id is required" }, { status: 400 });
  }

  const { data: gcn } = await serviceClient
    .from("goods_collection_notes")
    .select("status, warehouse_id")
    .eq("id", id)
    .single();

  if (!gcn) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (gcn.status !== "in_warehouse") {
    return NextResponse.json({ error: "GCN must be in a warehouse before it can be transferred" }, { status: 409 });
  }
  if (gcn.warehouse_id === toWarehouseId) {
    return NextResponse.json({ error: "Already at that warehouse" }, { status: 400 });
  }

  const { data: existingPending } = await serviceClient
    .from("gcn_tracking_events")
    .select("id")
    .eq("gcn_id", id)
    .eq("event_type", "warehouse_transfer")
    .eq("approval_status", "pending")
    .maybeSingle();

  if (existingPending) {
    return NextResponse.json({ error: "A transfer for this GCN is already pending approval" }, { status: 409 });
  }

  const { data, error } = await serviceClient
    .from("gcn_tracking_events")
    .insert({
      gcn_id: id,
      event_type: "warehouse_transfer",
      approval_status: "pending",
      from_warehouse_id: gcn.warehouse_id,
      to_warehouse_id: toWarehouseId,
      requested_by: user.id,
      notes,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
