import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

const VALID_JOB_STATUSES = [
  "draft",
  "ready_for_collection",
  "goods_collected",
  "export_documentation_complete",
  "uae_customs_clearance",
  "border_exit",
  "saudi_customs_clearance",
  "in_transit_saudi",
  "delivered",
  "closed",
] as const;

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!status) return NextResponse.json({ error: "status is required" }, { status: 400 });

  if (!VALID_JOB_STATUSES.includes(status as typeof VALID_JOB_STATUSES[number])) {
    return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
  }

  // Update the job order status
  const { error: jobError } = await serviceClient
    .from("job_orders")
    .update({ status, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });

  // Log the status change
  const { data, error } = await serviceClient
    .from("job_status_updates")
    .insert({
      job_order_id: id,
      truck_id: body.truck_id || null,
      status,
      notes: body.notes || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "JOB_STATUS_UPDATED",
    entity_type: "job_orders",
    entity_id: id,
    details: { status, notes: body.notes },
  });

  return NextResponse.json(data, { status: 201 });
}
