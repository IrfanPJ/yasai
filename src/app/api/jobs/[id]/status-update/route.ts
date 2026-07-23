import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!status) return NextResponse.json({ error: "status is required" }, { status: 400 });

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
