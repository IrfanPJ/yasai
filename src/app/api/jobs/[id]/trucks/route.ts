import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor", "finance", "viewer"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { serviceClient } = auth;

  const { data, error } = await serviceClient
    .from("job_order_trucks")
    .select("*")
    .eq("job_order_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();

  const { data, error } = await serviceClient
    .from("job_order_trucks")
    .insert({
      job_order_id: id,
      truck_number: body.truck_number || null,
      trailer_number: body.trailer_number || null,
      driver_name: body.driver_name || null,
      driver_phone: body.driver_phone || null,
      notes: body.notes || null,
      status: "created",
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "TRUCK_ADDED",
    entity_type: "job_orders",
    entity_id: id,
    details: { truck_number: body.truck_number, driver_name: body.driver_name },
  });

  return NextResponse.json(data, { status: 201 });
}
