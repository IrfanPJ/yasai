import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();

  const { data: job } = await serviceClient
    .from("job_orders")
    .select("status, gm_approval_status")
    .eq("id", id)
    .single();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.gm_approval_status !== "approved") {
    return NextResponse.json({ error: "Job must be approved by GM before loading" }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from("job_orders")
    .update({
      status: "goods_collected",
      loaded_by: user.id,
      loaded_at: new Date().toISOString(),
      driver_signature_received: Boolean(body.driver_signature_received),
      updated_by: user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "JOB_LOADING_CONFIRMED",
    entity_type: "job_orders",
    entity_id: id,
    details: { driver_signature_received: Boolean(body.driver_signature_received) },
  });

  return NextResponse.json(data);
}
