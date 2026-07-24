import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string; truckId: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id, truckId } = await params;
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();

  const { data, error } = await serviceClient
    .from("job_order_trucks")
    .update({
      truck_number: body.truck_number ?? undefined,
      trailer_number: body.trailer_number ?? undefined,
      driver_name: body.driver_name ?? undefined,
      driver_phone: body.driver_phone ?? undefined,
      notes: body.notes ?? undefined,
      fazza_token: body.fazza_token ?? undefined,
      border_status: body.border_status ?? undefined,
      customs_duty_amount: body.customs_duty_amount ?? undefined,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", truckId)
    .eq("job_order_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id, truckId } = await params;
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { error } = await serviceClient
    .from("job_order_trucks")
    .delete()
    .eq("id", truckId)
    .eq("job_order_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "TRUCK_REMOVED",
    entity_type: "job_orders",
    entity_id: id,
    details: { truck_id: truckId },
  });

  return NextResponse.json({ ok: true });
}
